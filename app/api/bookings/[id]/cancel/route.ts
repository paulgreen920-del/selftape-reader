import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { id: string };

export async function POST(
  req: Request,
  props: { params: Params } | { params: Promise<Params> }
) {
  try {
    const raw = (props as any).params;
    const resolved: Params = typeof raw?.then === "function" ? await raw : raw;
    const bookingId = resolved.id;

    console.log(`[cancel] Attempting to cancel booking: ${bookingId}`);

    // Find the booking
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        status: true,
        readerId: true,
        startTime: true,
        endTime: true
      }
    });

    if (!booking) {
      console.log(`[cancel] Booking ${bookingId} not found`);
      return NextResponse.json({ ok: true, message: "Booking not found or already cancelled" });
    }

    // Only cancel PENDING bookings
    if (booking.status !== "PENDING") {
      console.log(`[cancel] Booking ${bookingId} status is ${booking.status}, not PENDING`);
      return NextResponse.json({ ok: true, message: "Booking already processed" });
    }

    // Unmark availability slots
    const slotsUpdated = await prisma.availabilitySlot.updateMany({
      where: {
        userId: booking.readerId,
        startTime: { gte: booking.startTime, lt: booking.endTime },
        isBooked: true
      },
      data: { 
        isBooked: false, 
        bookingId: null 
      }
    });

    console.log(`[cancel] Unmarked ${slotsUpdated.count} availability slots`);

    // Delete the booking
    await prisma.booking.delete({ 
      where: { id: bookingId } 
    });

    console.log(`[cancel] Successfully cancelled booking ${bookingId} and freed slots`);
    
    return NextResponse.json({ 
      ok: true,
      message: "Booking cancelled and slot freed"
    });
  } catch (err: any) {
    console.error("[cancel] Error:", err);
    return NextResponse.json({ 
      ok: false, 
      error: err.message 
    }, { status: 500 });
  }
}