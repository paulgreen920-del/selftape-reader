import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/bookings/[id]
 * Fetch a single booking by ID
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "Missing booking ID" },
        { status: 400 }
      );
    }

    const booking = await prisma.booking.findUnique({
      where: { id },
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

    if (!booking) {
      return NextResponse.json(
        { ok: false, error: "Booking not found" },
        { status: 404 }
      );
    }

    // Transform to cleaner property names
    const transformed = {
      id: booking.id,
      startTime: booking.startTime,
      endTime: booking.endTime,
      durationMinutes: booking.durationMinutes,
      status: booking.status,
      notes: booking.notes,
      meetingUrl: booking.meetingUrl,
      reader: {
        id: booking.User_Booking_readerIdToUser.id,
        displayName: booking.User_Booking_readerIdToUser.displayName,
        name: booking.User_Booking_readerIdToUser.displayName || booking.User_Booking_readerIdToUser.email,
        email: booking.User_Booking_readerIdToUser.email,
        timezone: booking.User_Booking_readerIdToUser.timezone,
      },
      actor: {
        id: booking.User_Booking_actorIdToUser.id,
        name: booking.User_Booking_actorIdToUser.name,
        email: booking.User_Booking_actorIdToUser.email,
      },
    };

    return NextResponse.json({ ok: true, booking: transformed });
  } catch (err: any) {
    console.error("[GET Booking] Error:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to fetch booking" },
      { status: 500 }
    );
  }
}
