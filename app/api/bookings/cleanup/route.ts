import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    
    // Find expired pending bookings
    const expiredBookings = await prisma.booking.findMany({
      where: {
        status: "PENDING",
        createdAt: {
          lt: tenMinutesAgo
        }
      },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        readerId: true
      }
    });

    console.log(`[cleanup] Found ${expiredBookings.length} expired pending bookings`);

    // For each booking, unmark the associated availability slots
    for (const booking of expiredBookings) {
      await prisma.availabilitySlot.updateMany({
        where: {
          userId: booking.readerId,
          startTime: {
            gte: booking.startTime,
            lt: booking.endTime
          },
          isBooked: true
        },
        data: {
          isBooked: false,
          bookingId: null
        }
      });
    }

    // Delete the expired bookings
    const result = await prisma.booking.deleteMany({
      where: {
        status: "PENDING",
        createdAt: {
          lt: tenMinutesAgo
        }
      }
    });

    console.log(`[cleanup] Deleted ${result.count} expired pending bookings and unmarked availability slots`);
    
    return NextResponse.json({ 
      ok: true, 
      deleted: result.count,
      message: `Cleaned up ${result.count} abandoned bookings and restored availability`
    });
  } catch (err: any) {
    console.error("[cleanup] Error:", err);
    return NextResponse.json({ 
      ok: false, 
      error: err.message 
    }, { status: 500 });
  }
}