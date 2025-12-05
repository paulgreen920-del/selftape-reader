import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-11-17.clover",
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { readerId, actorId, date, startMin, durationMin, actorTimezone, sidesUrl, sidesLink, sidesFileName } = body as {
      readerId: string;
      actorId: string;
      date: string; // YYYY-MM-DD
      startMin: number; // e.g., 540 for 9:00 AM in actor's timezone
      durationMin: number; // 15, 30, or 60
      actorTimezone?: string; // Actor's timezone
      sidesUrl?: string;
      sidesLink?: string;
      sidesFileName?: string;
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
        timezone: true,
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
    
    // The startMin is minutes from midnight in the ACTOR's timezone
    // We need to convert this to UTC
    const [year, month, day] = date.split('-').map(Number);
    const startHour = Math.floor(startMin / 60);
    const startMinute = startMin % 60;
    
    // Convert actor's local time to UTC
    const startTime = localTimeToUTC(year, month, day, startHour, startMinute, selectedActorTZ);
    const endTime = new Date(startTime.getTime() + durationMin * 60 * 1000);
    
    console.log(`[bookings] Actor selects: ${startHour}:${String(startMinute).padStart(2, '0')} in ${selectedActorTZ}`);
    console.log(`[bookings] Start time UTC: ${startTime.toISOString()}`);
    console.log(`[bookings] Actor sees: ${startTime.toLocaleString('en-US', { timeZone: selectedActorTZ })}`);
    console.log(`[bookings] Reader sees: ${startTime.toLocaleString('en-US', { timeZone: readerTZ })}`);

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
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
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
              exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
            },
          }),
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);

        if (roomResponse.ok) {
          const room = await roomResponse.json();
          console.log("[bookings] Got meeting URL:", room.url);
          
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

    await createMeetingRoom();

    // Format times for Stripe checkout display - show in BOTH timezones for clarity
    const actorTimeStr = startTime.toLocaleString('en-US', { 
      timeZone: selectedActorTZ,
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short'
    });

    // Calculate platform fee (20%) and reader earnings (80%)
    const platformFeeCents = Math.round(booking.totalCents * 0.20);
    const readerEarningsCents = booking.totalCents - platformFeeCents;

    // Create Stripe Checkout session with Connect transfer
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${booking.durationMinutes}-minute session with ${reader.displayName || reader.name}`,
              description: `${booking.startTime.toLocaleDateString()} at ${booking.startTime.toLocaleTimeString()}`,
            },
            unit_amount: booking.totalCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      allow_promotion_codes: true,
      success_url: `${process.env.NEXT_PUBLIC_URL}/checkout/success?bookingId=${booking.id}`,
      cancel_url: `${process.env.NEXT_PUBLIC_URL}/sessions`,
      customer_email: actor.email,
      payment_intent_data: {
        application_fee_amount: platformFeeCents,
        transfer_data: {
          destination: reader.stripeAccountId,
        },
      },
      metadata: {
        bookingId: booking.id,
        readerId: reader.id,
      },
    });

    // Update booking with fee breakdown
    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        platformFeeCents,
        readerEarningsCents,
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

// Helper function to convert a time in a specific timezone to UTC
function localTimeToUTC(year: number, month: number, day: number, hour: number, minute: number, timezone: string): Date {
  // Create an ISO string for the local time
  const localDateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
  
  // Use Intl.DateTimeFormat to get the timezone offset for this timezone at this date/time
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  
  // Create date assuming it's UTC first
  const utcDate = new Date(localDateStr + 'Z');
  
  // Get what this UTC time would be in the target timezone
  const parts = formatter.formatToParts(utcDate);
  const getPart = (type: string) => parts.find(p => p.type === type)?.value || '0';
  
  const tzYear = parseInt(getPart('year'));
  const tzMonth = parseInt(getPart('month'));
  const tzDay = parseInt(getPart('day'));
  const tzHour = parseInt(getPart('hour'));
  const tzMinute = parseInt(getPart('minute'));
  
  // Calculate the offset in minutes
  const utcMinutes = utcDate.getUTCHours() * 60 + utcDate.getUTCMinutes();
  const tzMinutes = tzHour * 60 + tzMinute;
  
  // Handle day boundary differences
  let offsetMinutes = tzMinutes - utcMinutes;
  if (tzDay > utcDate.getUTCDate() || (tzMonth > utcDate.getUTCMonth() + 1)) {
    offsetMinutes += 24 * 60;
  } else if (tzDay < utcDate.getUTCDate() || (tzMonth < utcDate.getUTCMonth() + 1)) {
    offsetMinutes -= 24 * 60;
  }
  
  // Now create the actual date: we want localDateStr to BE the local time,
  // so we need to subtract the offset to get UTC
  const targetDate = new Date(localDateStr + 'Z');
  targetDate.setUTCMinutes(targetDate.getUTCMinutes() - offsetMinutes);
  
  return targetDate;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const readerId = searchParams.get("readerId");
    const scope = searchParams.get("scope") ?? "future";

    const now = new Date();
    let where: any = {};
    
    if (scope === "all") {
      if (readerId) {
        where = { readerId };
      }
    } else {
      if (readerId) {
        where = { readerId, startTime: { gte: now } };
      } else {
        where = { startTime: { gte: now } };
      }
    }

    const bookings = await prisma.booking.findMany({
      where,
      orderBy: { startTime: "desc" },
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
        name: b.User_Booking_readerIdToUser.name,
        displayName: b.User_Booking_readerIdToUser.displayName,
      },
      actor: {
        name: b.User_Booking_actorIdToUser.name,
        email: b.User_Booking_actorIdToUser.email,
      },
      actorName: b.User_Booking_actorIdToUser.name,
      actorEmail: b.User_Booking_actorIdToUser.email,
      priceCents: b.totalCents,
    }));

    return NextResponse.json({ ok: true, bookings: transformedBookings });
  } catch (err: any) {
    console.error("[GET /api/bookings] Error:", err);
    return NextResponse.json({ ok: false, error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}