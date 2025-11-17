import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/bookings/reschedule
 * Reschedule a booking - must be at least 2 hours before session for actors
 */
export async function POST(req: Request) {
  try {
    const { bookingId, newDate, newStartMin, requestedBy } = await req.json();

    if (!bookingId || !newDate || !newStartMin || !requestedBy) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate requestedBy
    if (!["ACTOR", "READER"].includes(requestedBy)) {
      return NextResponse.json(
        { ok: false, error: "Invalid requestedBy value" },
        { status: 400 }
      );
    }

    // Fetch booking
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        User_Booking_readerIdToUser: {
          select: {
            id: true,
            displayName: true,
            email: true,
            maxAdvanceBooking: true,
            minAdvanceHours: true,
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

    if (!booking) {
      return NextResponse.json(
        { ok: false, error: "Booking not found" },
        { status: 404 }
      );
    }

    // Check if booking is in valid state
    if (booking.status !== "CONFIRMED" && booking.status !== "PENDING") {
      return NextResponse.json(
        { ok: false, error: `Cannot reschedule ${booking.status.toLowerCase()} booking` },
        { status: 400 }
      );
    }

    const now = new Date();
    const currentStartTime = new Date(booking.startTime);
    const hoursUntilSession = (currentStartTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    // Check time window based on who is requesting
    if (requestedBy === "ACTOR" && hoursUntilSession < 2) {
      return NextResponse.json(
        {
          ok: false,
          error: "Actors must reschedule at least 2 hours before the session. Please cancel and book a new time instead.",
        },
        { status: 400 }
      );
    }

    if (requestedBy === "READER" && hoursUntilSession < 24) {
      return NextResponse.json(
        {
          ok: false,
          error: "Readers must reschedule at least 24 hours before the session to avoid penalties.",
          warning: "You may proceed, but this will count as a late cancellation.",
        },
        { status: 400 }
      );
    }

    // Parse new date and time
    const newStartTime = new Date(`${newDate}T${minutesToTime(newStartMin)}:00Z`);
    const newEndTime = new Date(newStartTime.getTime() + booking.durationMinutes * 60 * 1000);

    // Validate new time is in the future
    const hoursUntilNewSession = (newStartTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    const minAdvanceHours = booking.User_Booking_readerIdToUser.minAdvanceHours || 2;

    if (hoursUntilNewSession < minAdvanceHours) {
      return NextResponse.json(
        {
          ok: false,
          error: `New session time must be at least ${minAdvanceHours} hours in the future`,
        },
        { status: 400 }
      );
    }

    // Check if new time exceeds max advance booking
    const maxAdvanceHours = booking.User_Booking_readerIdToUser.maxAdvanceBooking || 360; // 15 days default
    if (hoursUntilNewSession > maxAdvanceHours) {
      return NextResponse.json(
        {
          ok: false,
          error: `Cannot book more than ${Math.round(maxAdvanceHours / 24)} days in advance`,
        },
        { status: 400 }
      );
    }

    // Check reader availability at new time
    const overlappingBookings = await prisma.booking.count({
      where: {
        readerId: booking.readerId,
        id: { not: bookingId }, // Exclude current booking
        status: { in: ["CONFIRMED", "PENDING"] },
        OR: [
          // New booking starts during existing booking
          {
            startTime: { lte: newStartTime },
            endTime: { gt: newStartTime },
          },
          // New booking ends during existing booking
          {
            startTime: { lt: newEndTime },
            endTime: { gte: newEndTime },
          },
          // New booking completely contains existing booking
          {
            startTime: { gte: newStartTime },
            endTime: { lte: newEndTime },
          },
        ],
      },
    });

    if (overlappingBookings > 0) {
      return NextResponse.json(
        { ok: false, error: "Reader is not available at the requested time" },
        { status: 400 }
      );
    }

    // Update booking with new time
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        startTime: newStartTime,
        endTime: newEndTime,
        // Store original time in notes
        notes: booking.notes
          ? `${booking.notes}\n\nRescheduled from ${currentStartTime.toISOString()} by ${requestedBy} on ${now.toISOString()}`
          : `Rescheduled from ${currentStartTime.toISOString()} by ${requestedBy} on ${now.toISOString()}`,
        updatedAt: now,
      },
      include: {
        User_Booking_readerIdToUser: {
          select: {
            id: true,
            displayName: true,
            email: true,
            timezone: true,
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

    // TODO: Send reschedule confirmation emails
    // TODO: Update calendar events
    // await sendRescheduleEmails(updatedBooking, requestedBy);

    return NextResponse.json({
      ok: true,
      booking: updatedBooking,
      message: "Booking successfully rescheduled",
    });
  } catch (err: any) {
    console.error("[Reschedule] Error:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to reschedule booking" },
      { status: 500 }
    );
  }
}

/**
 * Convert minutes since midnight to HH:MM format
 */
function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}
