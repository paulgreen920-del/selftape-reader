import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia",
});

/**
 * POST /api/bookings/cancel
 * Cancel a booking with automatic refund logic based on cancellation policy
 */
export async function POST(req: Request) {
  try {
    const { bookingId, canceledBy, reason } = await req.json();

    if (!bookingId || !canceledBy) {
      return NextResponse.json(
        { ok: false, error: "Missing bookingId or canceledBy" },
        { status: 400 }
      );
    }

    // Validate canceledBy
    if (!["ACTOR", "READER", "PLATFORM", "SYSTEM"].includes(canceledBy)) {
      return NextResponse.json(
        { ok: false, error: "Invalid canceledBy value" },
        { status: 400 }
      );
    }

    // Fetch booking with related data
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        User_Booking_readerIdToUser: true,
        User_Booking_actorIdToUser: true,
      },
    });

    if (!booking) {
      return NextResponse.json(
        { ok: false, error: "Booking not found" },
        { status: 404 }
      );
    }

    // Check if already canceled
    if (booking.status === "CANCELED") {
      return NextResponse.json(
        { ok: false, error: "Booking is already canceled" },
        { status: 400 }
      );
    }

    // Check if session already completed
    if (booking.status === "COMPLETED") {
      return NextResponse.json(
        { ok: false, error: "Cannot cancel a completed session" },
        { status: 400 }
      );
    }

    const now = new Date();
    const startTime = new Date(booking.startTime);
    const hoursUntilSession = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    // Determine refund policy based on who is canceling and when
    let refundPolicy: {
      refundAmount: number;
      processingFee: number;
      platformCredit: number;
      readerPenalty: boolean;
      message: string;
    };

    if (canceledBy === "ACTOR") {
      if (hoursUntilSession >= 2) {
        // Actor cancels with 2+ hours notice: Full refund minus processing fee
        const processingFee = Math.min(200, Math.round(booking.totalCents * 0.029) + 30); // ~$2 max
        refundPolicy = {
          refundAmount: booking.totalCents - processingFee,
          processingFee: processingFee,
          platformCredit: 0,
          readerPenalty: false,
          message: "Full refund issued minus processing fee (~$2)",
        };
      } else {
        // Actor cancels under 2 hours: No refund, reader gets paid
        refundPolicy = {
          refundAmount: 0,
          processingFee: 0,
          platformCredit: 0,
          readerPenalty: false,
          message: "No refund - canceled with less than 2 hours notice. Reader will be paid.",
        };
      }
    } else if (canceledBy === "READER") {
      if (hoursUntilSession >= 24) {
        // Reader cancels with 24+ hours: Full refund, no penalty
        refundPolicy = {
          refundAmount: booking.totalCents,
          processingFee: 0,
          platformCredit: 0,
          readerPenalty: false,
          message: "Full refund issued - Reader canceled with adequate notice",
        };
      } else {
        // Reader cancels under 24 hours: Full refund + warning
        refundPolicy = {
          refundAmount: booking.totalCents,
          processingFee: 0,
          platformCredit: 0,
          readerPenalty: true,
          message: "Full refund issued - Reader will receive a warning for late cancellation",
        };
      }
    } else if (canceledBy === "PLATFORM" || canceledBy === "SYSTEM") {
      // Platform/technical issue: Full refund + credit
      refundPolicy = {
        refundAmount: booking.totalCents,
        processingFee: 0,
        platformCredit: 500, // $5 credit
        readerPenalty: false,
        message: "Full refund + $5 platform credit for service disruption",
      };
    } else {
      return NextResponse.json(
        { ok: false, error: "Invalid cancellation scenario" },
        { status: 400 }
      );
    }

    // Process refund via Stripe if refund amount > 0
    let stripeRefundId: string | null = null;
    if (refundPolicy.refundAmount > 0 && booking.stripePaymentIntentId) {
      try {
        const refund = await stripe.refunds.create({
          payment_intent: booking.stripePaymentIntentId,
          amount: refundPolicy.refundAmount,
          reason: "requested_by_customer",
          metadata: {
            bookingId: booking.id,
            canceledBy,
            originalAmount: booking.totalCents.toString(),
            processingFee: refundPolicy.processingFee.toString(),
          },
        });
        stripeRefundId = refund.id;
      } catch (stripeError: any) {
        console.error("[Cancel] Stripe refund failed:", stripeError);
        return NextResponse.json(
          { ok: false, error: `Refund failed: ${stripeError.message}` },
          { status: 500 }
        );
      }
    }

    // Update booking status
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: "CANCELED",
        canceledAt: now,
        canceledBy,
        cancelReason: reason || null,
        refundStatus: refundPolicy.refundAmount > 0 ? "COMPLETED" : "NONE",
        refundCents: refundPolicy.refundAmount,
        refundIssuedAt: refundPolicy.refundAmount > 0 ? now : null,
        processingFeeCents: refundPolicy.processingFee,
        platformCreditCents: refundPolicy.platformCredit,
        stripeRefundId,
      },
    });

    // Update reader reliability if penalty applies
    if (refundPolicy.readerPenalty && canceledBy === "READER") {
      await prisma.user.update({
        where: { id: booking.readerId },
        data: {
          canceledSessions: { increment: 1 },
          lastWarningAt: now,
        },
      });

      // Check if suspension is needed (3+ cancellations in 30 days)
      const recentCancellations = await prisma.booking.count({
        where: {
          readerId: booking.readerId,
          status: "CANCELED",
          canceledBy: "READER",
          canceledAt: {
            gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      });

      if (recentCancellations >= 3) {
        const suspensionEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
        await prisma.user.update({
          where: { id: booking.readerId },
          data: {
            suspendedUntil: suspensionEnd,
            suspensionReason: `Suspended for ${recentCancellations} late cancellations in 30 days`,
          },
        });
      }
    }

    // Calculate reader reliability score
    await updateReaderReliabilityScore(booking.readerId);

    // TODO: Send cancellation emails to both parties
    // await sendCancellationEmails(booking, canceledBy, refundPolicy);

    return NextResponse.json({
      ok: true,
      booking: updatedBooking,
      refund: {
        amount: refundPolicy.refundAmount,
        processingFee: refundPolicy.processingFee,
        platformCredit: refundPolicy.platformCredit,
        message: refundPolicy.message,
      },
    });
  } catch (err: any) {
    console.error("[Cancel] Error:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to cancel booking" },
      { status: 500 }
    );
  }
}

/**
 * Update reader's reliability score based on their session history
 */
async function updateReaderReliabilityScore(readerId: string) {
  const reader = await prisma.user.findUnique({
    where: { id: readerId },
    select: {
      totalSessions: true,
      completedSessions: true,
      canceledSessions: true,
      noShowSessions: true,
      lateArrivals: true,
    },
  });

  if (!reader || reader.totalSessions === 0) {
    return;
  }

  // Calculate reliability score (0-100)
  const completionRate = (reader.completedSessions / reader.totalSessions) * 100;
  const cancelPenalty = (reader.canceledSessions / reader.totalSessions) * 20;
  const noShowPenalty = (reader.noShowSessions / reader.totalSessions) * 50;
  const latePenalty = (reader.lateArrivals / reader.totalSessions) * 10;

  const reliabilityScore = Math.max(
    0,
    Math.min(100, completionRate - cancelPenalty - noShowPenalty - latePenalty)
  );

  await prisma.user.update({
    where: { id: readerId },
    data: { reliabilityScore },
  });
}
