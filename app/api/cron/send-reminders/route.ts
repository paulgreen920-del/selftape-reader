import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendBookingReminders } from "@/lib/send-booking-reminder";

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: Request) {
  try {
    // Verify this is coming from Vercel Cron
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.log('[Cron] Unauthorized request to send-reminders');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Cron] Starting reminder check...');
    const now = new Date();

    // Calculate time windows
    // 24-hour window: 23.5 to 24.5 hours from now
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const twentyFourHoursStart = new Date(twentyFourHoursFromNow.getTime() - 30 * 60 * 1000);
    const twentyFourHoursEnd = new Date(twentyFourHoursFromNow.getTime() + 30 * 60 * 1000);

    // 1-hour window: 0.5 to 1.5 hours from now
    const oneHourFromNow = new Date(now.getTime() + 1 * 60 * 60 * 1000);
    const oneHourStart = new Date(oneHourFromNow.getTime() - 30 * 60 * 1000);
    const oneHourEnd = new Date(oneHourFromNow.getTime() + 30 * 60 * 1000);

    console.log('[Cron] Time windows:', {
      now: now.toISOString(),
      twentyFourHourWindow: `${twentyFourHoursStart.toISOString()} to ${twentyFourHoursEnd.toISOString()}`,
      oneHourWindow: `${oneHourStart.toISOString()} to ${oneHourEnd.toISOString()}`
    });

    // Find bookings that need 24-hour reminders
    const bookingsFor24hReminder = await prisma.booking.findMany({
      where: {
        status: { in: ['CONFIRMED', 'COMPLETED'] },
        reminder24hSent: false,
        startTime: {
          gte: twentyFourHoursStart,
          lte: twentyFourHoursEnd
        }
      },
      include: {
        User_Booking_readerIdToUser: {
          select: {
            id: true,
            name: true,
            displayName: true,
            email: true,
            timezone: true
          }
        },
        User_Booking_actorIdToUser: {
          select: {
            id: true,
            name: true,
            email: true,
            timezone: true
          }
        }
      }
    });

    console.log(`[Cron] Found ${bookingsFor24hReminder.length} bookings for 24h reminders`);

    // Find bookings that need 1-hour reminders
    const bookingsFor1hReminder = await prisma.booking.findMany({
      where: {
        status: { in: ['CONFIRMED', 'COMPLETED'] },
        reminder1hSent: false,
        startTime: {
          gte: oneHourStart,
          lte: oneHourEnd
        }
      },
      include: {
        User_Booking_readerIdToUser: {
          select: {
            id: true,
            name: true,
            displayName: true,
            email: true,
            timezone: true
          }
        },
        User_Booking_actorIdToUser: {
          select: {
            id: true,
            name: true,
            email: true,
            timezone: true
          }
        }
      }
    });

    console.log(`[Cron] Found ${bookingsFor1hReminder.length} bookings for 1h reminders`);

    const results = {
      twentyFourHour: { sent: 0, failed: 0 },
      oneHour: { sent: 0, failed: 0 }
    };

    // Send 24-hour reminders
    for (const booking of bookingsFor24hReminder) {
      try {
        await sendBookingReminders(booking as any, '24h');
        await prisma.booking.update({
          where: { id: booking.id },
          data: { reminder24hSent: true }
        });
        results.twentyFourHour.sent++;
        console.log(`[Cron] ✅ 24h reminder sent for booking ${booking.id}`);
      } catch (error) {
        console.error(`[Cron] ❌ Failed 24h reminder for ${booking.id}:`, error);
        results.twentyFourHour.failed++;
      }
    }

    // Send 1-hour reminders
    for (const booking of bookingsFor1hReminder) {
      try {
        await sendBookingReminders(booking as any, '1h');
        await prisma.booking.update({
          where: { id: booking.id },
          data: { reminder1hSent: true }
        });
        results.oneHour.sent++;
        console.log(`[Cron] ✅ 1h reminder sent for booking ${booking.id}`);
      } catch (error) {
        console.error(`[Cron] ❌ Failed 1h reminder for ${booking.id}:`, error);
        results.oneHour.failed++;
      }
    }

    console.log('[Cron] Reminder check complete:', results);

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      results
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Cron] Error in send-reminders:', error);
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 });
  }
}