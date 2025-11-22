import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * DELETE expired pending bookings
 * Run this via cron or manually to clean up abandoned checkouts
 */
export async function POST() {
  try {
    // Delete pending bookings older than 30 minutes
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    
    const result = await prisma.booking.deleteMany({
      where: {
        status: "PENDING",
        createdAt: {
          lt: thirtyMinutesAgo
        }
      }
    });

    console.log(`[cleanup] Deleted ${result.count} expired pending bookings`);
    
    return NextResponse.json({ 
      ok: true, 
      deleted: result.count,
      message: `Cleaned up ${result.count} abandoned bookings`
    });
  } catch (err: any) {
    console.error("[cleanup] Error:", err);
    return NextResponse.json({ 
      ok: false, 
      error: err.message 
    }, { status: 500 });
  }
}
