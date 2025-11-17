import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-10-29.clover",
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { readerId, actorId, date, startMin, durationMin, actorTimezone, sidesUrl, sidesLink, sidesFileName } = body as {
      readerId: string;
      actorId: string;
      date: string; // YYYY-MM-DD
      startMin: number; // e.g., 540 for 9:00 AM
      durationMin: number; // 15, 30, or 60
      actorTimezone?: string; // Actor's timezone
      sidesUrl?: string; // URL to uploaded file
      sidesLink?: string; // External link to sides
      sidesFileName?: string; // Original filename
    };

    if (!readerId || !actorId || !date || startMin == null || !durationMin) {
      return NextResponse.json({ ok: false, error: "Missing required fields" }, { status: 400 });
    }

    // Get reader
    const reader = await prisma.user.findUnique({
      where: { id: readerId },
      select: {
        id: true,
        displayName: true,
        name: true,
        email: true,
        role: true,
        timezone: true, // Add timezone for proper time handling
        ratePer15Min: true,
        ratePer30Min: true,
        ratePer60Min: true,
        stripeAccountId: true,
      },
    });

    if (!reader || (reader.role !== "READER" && reader.role !== "ADMIN")) {
      return NextResponse.json({ ok: false, error: "Reader not found" }, { status: 404 });
    }

    if (!reader.stripeAccountId) {
      return NextResponse.json(
        { ok: false, error: "Reader hasn't set up payments yet" },
        { status: 400 }
      );
    }

    // Get actor
    const actor = await prisma.user.findUnique({
      where: { id: actorId },
      select: { id: true, name: true, email: true },
    });

    if (!actor) {
      return NextResponse.json({ ok: false, error: "Actor not found" }, { status: 404 });
    }

    // Calculate price
    let priceCents: number;
    if (durationMin === 15) priceCents = reader.ratePer15Min || 1500;
    else if (durationMin === 30) priceCents = reader.ratePer30Min || 2500;
    else if (durationMin === 60) priceCents = reader.ratePer60Min || 6000;
    else {
      return NextResponse.json({ ok: false, error: "Invalid duration" }, { status: 400 });
    }

    // Build start and end times with proper timezone handling
    const readerTZ = reader.timezone || "America/New_York";
    const selectedActorTZ = actorTimezone || "America/New_York";
    const [year, month, day] = date.split('-').map(Number);
    const startHour = Math.floor(startMin / 60);
    const startMinute = startMin % 60;
    
    // Create the datetime in the actor's timezone, then store as UTC
    // This ensures the selected time is interpreted correctly
    const localDateTimeString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}:00`;
    
    // Parse as local time in actor's timezone
    const startTime = new Date(localDateTimeString);
    const endTime = new Date(startTime.getTime() + durationMin * 60 * 1000);
    
    console.log(`[bookings] Actor selects: ${startHour}:${String(startMinute).padStart(2, '0')} in ${selectedActorTZ}`);
    console.log(`[bookings] Start time UTC: ${startTime.toISOString()}`);
    console.log(`[bookings] Actor sees: ${startTime.toLocaleString('en-US', { timeZone: selectedActorTZ })}`);
    console.log(`[bookings] Reader sees: ${startTime.toLocaleString('en-US', { timeZone: readerTZ })}`);
    
    // Store timezone info for future display

    // Check for existing booking (deduplication)
    const existing = await prisma.booking.findFirst({
      where: {
        readerId,
        actorId,
        startTime,
        endTime,
      },
    });

    if (existing) {
      return NextResponse.json(
        { ok: true, booking: existing, message: "Booking already exists" },
        { status: 200 }
      );
    }

    // Create booking
    const booking = await prisma.booking.create({
      data: {
        id: `booking_${Date.now()}_${actorId}`,
        readerId,
        actorId,
        startTime,
        endTime,
        durationMinutes: durationMin,
        totalCents: priceCents,
        status: "PENDING",
        sidesUrl: sidesUrl || null,
        sidesLink: sidesLink || null,
        sidesFileName: sidesFileName || null,
        updatedAt: new Date(),
      },
    });

    // Create Daily.co meeting room before checkout
    const createMeetingRoom = async () => {
      try {
        const DAILY_API_KEY = process.env.DAILY_API_KEY;
        const DAILY_API_BASE = "https://api.daily.co/v1";
        
        if (!DAILY_API_KEY) {
          console.error("[bookings] Daily.co API key not configured");
          return;
        }

        console.log("[bookings] Creating Daily.co room for booking:", booking.id);
        
        // Add timeout to Daily.co API call
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        const roomResponse = await fetch(`${DAILY_API_BASE}/rooms`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${DAILY_API_KEY}`,
          },
          body: JSON.stringify({
            name: `booking-${booking.id}`,
            privacy: "public",
            properties: {
              enable_screenshare: true,
              enable_chat: true,
              enable_knocking: false,
              start_video_off: false,
              start_audio_off: false,
              exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 1 week expiry
            },
          }),
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);

        if (roomResponse.ok) {
          const room = await roomResponse.json();
          console.log("[bookings] Got meeting URL:", room.url);
          
          // Update booking with meeting URL
          await prisma.booking.update({
            where: { id: booking.id },
            data: { meetingUrl: room.url },
          });
          console.log("[bookings] Updated booking with meeting URL");
        } else {
          const error = await roomResponse.text();
          console.error("[bookings] Daily.co room creation failed:", error);
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
          console.error("[bookings] Daily.co room creation timed out");
        } else {
          console.error("[bookings] Failed to create Daily.co room:", err);
        }
      }
    };

    // Wait for room creation before proceeding to checkout
    await createMeetingRoom();

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${durationMin}-minute session with ${reader.displayName || reader.name}`,
              description: `${startTime.toLocaleDateString()} at ${startTime.toLocaleTimeString()}`,
            },
            unit_amount: priceCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_URL}/checkout/success?bookingId=${booking.id}`,
      cancel_url: `${process.env.NEXT_PUBLIC_URL}/reader/${readerId}`,
      customer_email: actor.email,
      metadata: {
        bookingId: booking.id,
        readerId: reader.id,
      },
    });

    console.log("[bookings] Stripe session created:", session.id);
    console.log("[bookings] Checkout URL:", session.url);
    return NextResponse.json({ ok: true, bookingId: booking.id, checkoutUrl: session.url }, { status: 200 });
  } catch (err: any) {
    console.error("[bookings] Error:", err);
    return NextResponse.json({ ok: false, error: err.message || "Failed to create booking" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const readerId = searchParams.get("readerId");
    const scope = searchParams.get("scope") ?? "future";

    const now = new Date();
    let where: any = {};
    
    if (scope === "all") {
      // For scope=all without readerId, return all bookings in system
      if (readerId) {
        where = { readerId };
      }
      // No additional filtering
    } else {
      // Future bookings only
      if (readerId) {
        where = { readerId, startTime: { gte: now } };
      } else {
        where = { startTime: { gte: now } };
      }
    }

    const bookings = await prisma.booking.findMany({
      where,
      orderBy: { startTime: "desc" }, // Latest first for dev view
      include: {
        User_Booking_readerIdToUser: {
          select: {
            id: true,
            name: true,
            displayName: true,
          },
        },
        User_Booking_actorIdToUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Transform to match expected format
    const transformedBookings = bookings.map((b: any) => ({
      id: b.id,
      status: b.status,
      startTime: b.startTime,
      endTime: b.endTime,
      durationMinutes: b.durationMinutes,
      totalCents: b.totalCents,
      readerEarningsCents: b.readerEarningsCents,
      platformFeeCents: b.platformFeeCents,
      meetingUrl: b.meetingUrl,
      notes: b.notes,
      reader: {
        name: b.reader.name,
        displayName: b.reader.displayName,
      },
      actor: {
        name: b.actor.name,
        email: b.actor.email,
      },
      // Legacy fields for backward compatibility
      actorName: b.actor.name,
      actorEmail: b.actor.email,
      priceCents: b.totalCents,
    }));

    return NextResponse.json({ ok: true, bookings: transformedBookings });
  } catch (err: any) {
    console.error("[GET /api/bookings] Error:", err);
    return NextResponse.json({ ok: false, error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}

function minutesToTime(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}