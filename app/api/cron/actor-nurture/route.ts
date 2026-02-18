import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import { getActorNurtureEmail } from "@/lib/emails/actor-nurture-emails";

const resend = new Resend(process.env.RESEND_API_KEY);

// Timing: when to send each email
const TIMING = {
  1: 24 * 60 * 60 * 1000,      // 24 hours after signup
  2: 5 * 24 * 60 * 60 * 1000,  // 5 days after email #1
  3: 10 * 24 * 60 * 60 * 1000, // 10 days after email #2
};

export async function GET(req: Request) {
  try {
    // Verify cron secret
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();

    // Get actors who:
    // - Are actors
    // - Have verified email
    // - Haven't completed all 3 emails
    // - Have NOT made any bookings
    const actors = await prisma.user.findMany({
      where: {
        role: "ACTOR",
        emailVerified: true,
        setupReminderCount: { lt: 3 },
      },
      include: {
        Booking_Booking_actorIdToUser: {
          take: 1, // Just need to know if any exist
        },
      },
    });

    // Filter to actors with 0 bookings
    const actorsWithNoBookings = actors.filter(
      (actor) => actor.Booking_Booking_actorIdToUser.length === 0
    );

    console.log(`[actor-nurture] Found ${actorsWithNoBookings.length} actors with no bookings`);

    let sent = 0;
    const results: string[] = [];

    for (const actor of actorsWithNoBookings) {
      const currentCount = actor.setupReminderCount || 0;
      const nextEmailNumber = (currentCount + 1) as 1 | 2 | 3;

      // Determine the reference time
      let referenceTime: Date;
      if (nextEmailNumber === 1) {
        referenceTime = actor.createdAt;
      } else {
        referenceTime = actor.setupReminderLastSentAt || actor.createdAt;
      }

      // Check if enough time has passed
      const timeSinceReference = now.getTime() - referenceTime.getTime();
      const requiredTime = TIMING[nextEmailNumber];

      if (timeSinceReference < requiredTime) {
        continue; // Not time yet
      }

      // Send the email
      try {
        const emailContent = getActorNurtureEmail({
          name: actor.displayName || actor.name || "there",
          email: actor.email,
          reminderNumber: nextEmailNumber,
        });

        await resend.emails.send({
          from: "Self Tape Reader <hello@selftapereader.com>",
          to: actor.email,
          subject: emailContent.subject,
          html: emailContent.html,
          replyTo: "paul@selftapereader.com",
        });

        // Update the actor's reminder count
        await prisma.user.update({
          where: { id: actor.id },
          data: {
            setupReminderCount: nextEmailNumber,
            setupReminderLastSentAt: now,
          },
        });

        console.log(`[actor-nurture] Sent email #${nextEmailNumber} to ${actor.email}`);
        results.push(`Email #${nextEmailNumber} → ${actor.email}`);
        sent++;

        // Rate limiting: 600ms between sends (Resend limit)
        await new Promise((resolve) => setTimeout(resolve, 600));
      } catch (emailErr: any) {
        console.error(`[actor-nurture] Failed to send to ${actor.email}:`, emailErr.message);
      }
    }

    return NextResponse.json({
      ok: true,
      checked: actorsWithNoBookings.length,
      sent,
      results,
    });
  } catch (err: any) {
    console.error("[actor-nurture] Error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
