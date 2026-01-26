import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendSetupReminder } from '@/lib/setup-reminder-emails';

// Timing thresholds
const REMINDER_1_AFTER_SIGNUP_HOURS = 2;      // 2 hours after signup
const REMINDER_2_AFTER_LAST_EMAIL_HOURS = 48; // 2 days after reminder #1
const REMINDER_3_AFTER_LAST_EMAIL_HOURS = 72; // 3 days after reminder #2

export async function GET(req: NextRequest) {
  // Verify cron secret (optional but recommended)
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    
    // Find all readers with incomplete setup who haven't maxed out reminders
    const incompleteReaders = await prisma.user.findMany({
      where: {
        role: 'READER',
        isActive: true,
        setupReminderCount: { lt: 3 }, // Haven't sent all 3 reminders yet
      },
      include: {
        CalendarConnection: true,
        ICalConnections: true,
        AvailabilityTemplate: {
          where: { isActive: true },
        },
        AvailabilitySlot: {
          where: { 
            startTime: { gte: now }, 
            isBooked: false 
          },
        },
      },
    });

    let sent = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const reader of incompleteReaders) {
      // Calculate setup status
      const status = {
        hasProfile: !!(reader.displayName && reader.bio),
        hasHeadshot: !!reader.headshotUrl,
        hasCalendar: !!(reader.CalendarConnection || reader.ICalConnections.length > 0),
        hasAvailability: reader.AvailabilityTemplate.length > 0 || reader.AvailabilitySlot.length > 0,
        hasStripe: !!reader.stripeAccountId,
      };

      // Check if setup is actually complete
      const isComplete = status.hasProfile && status.hasHeadshot && 
                         status.hasCalendar && status.hasAvailability && status.hasStripe;
      
      if (isComplete) {
        skipped++;
        continue; // They're done, no need to email
      }

      // Calculate timing
      const hoursSinceSignup = (now.getTime() - reader.createdAt.getTime()) / (1000 * 60 * 60);
      const hoursSinceLastEmail = reader.setupReminderLastSentAt 
        ? (now.getTime() - reader.setupReminderLastSentAt.getTime()) / (1000 * 60 * 60)
        : null;
      
      // Determine which reminder to send (if any)
      let reminderToSend: 1 | 2 | 3 | null = null;
      
      if (reader.setupReminderCount === 0) {
        // First reminder: based on signup time
        if (hoursSinceSignup >= REMINDER_1_AFTER_SIGNUP_HOURS) {
          reminderToSend = 1;
        }
      } else if (reader.setupReminderCount === 1 && hoursSinceLastEmail !== null) {
        // Second reminder: 48 hours after first reminder
        if (hoursSinceLastEmail >= REMINDER_2_AFTER_LAST_EMAIL_HOURS) {
          reminderToSend = 2;
        }
      } else if (reader.setupReminderCount === 2 && hoursSinceLastEmail !== null) {
        // Third reminder: 72 hours after second reminder
        if (hoursSinceLastEmail >= REMINDER_3_AFTER_LAST_EMAIL_HOURS) {
          reminderToSend = 3;
        }
      }

      if (!reminderToSend) {
        skipped++;
        continue; // Not time yet
      }

      // Send the email
      const result = await sendSetupReminder(
        { email: reader.email, displayName: reader.displayName, name: reader.name },
        status,
        reminderToSend
      );

      if (result.success) {
        // Update the user's reminder tracking
        await prisma.user.update({
          where: { id: reader.id },
          data: {
            setupReminderCount: reminderToSend,
            setupReminderLastSentAt: now,
          },
        });
        sent++;
      } else {
        errors.push(`${reader.email}: ${result.error}`);
      }
    }

    console.log(`[Cron] Setup reminders: ${sent} sent, ${skipped} skipped, ${errors.length} errors`);

    return NextResponse.json({
      ok: true,
      sent,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: now.toISOString(),
    });
  } catch (error: any) {
    console.error('[Cron] Setup reminder cron failed:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}