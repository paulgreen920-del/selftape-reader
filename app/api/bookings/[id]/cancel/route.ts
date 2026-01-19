import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-11-17.clover",
});

type Params = { id: string };

export async function POST(
  req: Request,
  props: { params: Params } | { params: Promise<Params> }
) {
  try {
    const raw = (props as any).params;
    const resolved: Params = typeof raw?.then === "function" ? await raw : raw;
    const bookingId = resolved.id;

    // Get current user
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { ok: false, error: "You must be logged in to cancel a booking" },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    console.log(`[cancel] User ${userId} attempting to cancel booking ${bookingId}`);

    // Find the booking with full details
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        User_Booking_readerIdToUser: {
          select: {
            id: true,
            email: true,
            name: true,
            displayName: true,
            canceledSessions: true,
            lastWarningAt: true,
            CalendarConnection: true,
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

    // Check if user is actor or reader on this booking
    const isActor = booking.actorId === userId;
    const isReader = booking.readerId === userId;

    if (!isActor && !isReader) {
      return NextResponse.json(
        { ok: false, error: "You are not authorized to cancel this booking" },
        { status: 403 }
      );
    }

    // Check if already cancelled
    if (booking.status === "CANCELED") {
      return NextResponse.json(
        { ok: false, error: "This booking has already been cancelled" },
        { status: 400 }
      );
    }

    // Check if already completed
    if (booking.status === "COMPLETED") {
      return NextResponse.json(
        { ok: false, error: "Cannot cancel a completed session" },
        { status: 400 }
      );
    }

    const now = new Date();
    const sessionStart = new Date(booking.startTime);
    const hoursUntilSession = (sessionStart.getTime() - now.getTime()) / (1000 * 60 * 60);

    console.log(`[cancel] Hours until session: ${hoursUntilSession.toFixed(2)}`);
    console.log(`[cancel] Canceler: ${isActor ? "ACTOR" : "READER"}`);

    let refundAmount = 0;
    let refundType: "full" | "partial" | "none" = "none";
    let readerWarning = false;

    if (isReader) {
      // READER CANCELS: Actor always gets full refund
      refundAmount = booking.totalCents;
      refundType = "full";
      
      // Warn reader for late cancellations (under 24 hours)
      if (hoursUntilSession < 24) {
        readerWarning = true;
        console.log(`[cancel] Reader late cancellation - issuing warning`);
      }
    } else {
      // ACTOR CANCELS: Refund depends on timing
      if (hoursUntilSession >= 2) {
        // 2+ hours notice: full refund minus ~$2 processing fee
        const processingFee = 200; // $2.00 in cents
        refundAmount = Math.max(0, booking.totalCents - processingFee);
        refundType = "partial";
        console.log(`[cancel] Actor cancel with 2+ hours notice - refund minus fee`);
      } else {
        // Under 2 hours: no refund, reader keeps payment
        refundAmount = 0;
        refundType = "none";
        console.log(`[cancel] Actor late cancel - no refund, reader gets paid`);
      }
    }

    // Issue Stripe refund if applicable
    let stripeRefundId: string | null = null;
    
    if (refundAmount > 0 && booking.stripePaymentIntentId) {
      try {
        console.log(`[cancel] Issuing Stripe refund: ${refundAmount} cents`);
        
        const refund = await stripe.refunds.create({
          payment_intent: booking.stripePaymentIntentId,
          amount: refundAmount,
          reason: "requested_by_customer",
        });
        
        stripeRefundId = refund.id;
        console.log(`[cancel] Stripe refund created: ${stripeRefundId}`);
      } catch (stripeError: any) {
        console.error(`[cancel] Stripe refund failed:`, stripeError.message);
        return NextResponse.json(
          { ok: false, error: `Refund failed: ${stripeError.message}` },
          { status: 500 }
        );
      }
    }

    // Update reader stats if reader cancelled with late warning
    if (isReader && readerWarning) {
      await prisma.user.update({
        where: { id: booking.readerId },
        data: {
          canceledSessions: { increment: 1 },
          lastWarningAt: now,
        },
      });
      console.log(`[cancel] Updated reader cancel stats with warning`);
    } else if (isReader) {
      await prisma.user.update({
        where: { id: booking.readerId },
        data: {
          canceledSessions: { increment: 1 },
        },
      });
      console.log(`[cancel] Updated reader cancel stats`);
    }

    // Free up availability slots
    const slotsUpdated = await prisma.availabilitySlot.updateMany({
      where: {
        userId: booking.readerId,
        startTime: { gte: booking.startTime, lt: booking.endTime },
        isBooked: true,
      },
      data: {
        isBooked: false,
        bookingId: null,
      },
    });
    console.log(`[cancel] Freed ${slotsUpdated.count} availability slots`);

    // Update booking status (don't delete - keep for records)
    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: "CANCELED",
        canceledAt: now,
        canceledBy: isActor ? "ACTOR" : "READER",
        cancelReason: isActor 
          ? (hoursUntilSession >= 2 ? "Actor cancelled (advance notice)" : "Actor cancelled (late)")
          : (hoursUntilSession >= 24 ? "Reader cancelled (advance notice)" : "Reader cancelled (late)"),
        refundCents: refundAmount,
        refundStatus: refundAmount > 0 ? "COMPLETED" : "NONE",
        refundIssuedAt: refundAmount > 0 ? now : null,
        stripeRefundId: stripeRefundId,
      },
    });

    console.log(`[cancel] Booking updated to CANCELLED status`);

    // Delete calendar event if it exists
    const reader = booking.User_Booking_readerIdToUser;
    if (reader.CalendarConnection) {
      try {
        const { deleteCalendarEventForBooking } = await import("@/lib/calendar-sync");
        
        if (booking.googleEventId) {
          console.log(`[cancel] Deleting Google Calendar event: ${booking.googleEventId}`);
          await deleteCalendarEventForBooking(reader.id, booking.googleEventId, 'GOOGLE');
        }
        
        if (booking.microsoftEventId) {
          console.log(`[cancel] Deleting Microsoft Calendar event: ${booking.microsoftEventId}`);
          await deleteCalendarEventForBooking(reader.id, booking.microsoftEventId, 'MICROSOFT');
        }
      } catch (calendarError: any) {
        console.error(`[cancel] Failed to delete calendar event:`, calendarError.message);
      }
    }

    // Send cancellation emails to both parties
    const actor = booking.User_Booking_actorIdToUser;

    try {
      const { sendCancellationEmails } = await import("@/lib/send-cancellation-emails");
      await sendCancellationEmails({
        booking: {
          id: booking.id,
          startTime: booking.startTime,
          durationMinutes: booking.durationMinutes,
          totalCents: booking.totalCents,
        },
        reader: {
          id: reader.id,
          email: reader.email,
          name: reader.name,
          displayName: reader.displayName,
        },
        actor: {
          id: actor.id,
          email: actor.email,
          name: actor.name,
        },
        canceledBy: isActor ? "ACTOR" : "READER",
        refundAmount,
        refundType,
        readerWarning,
      });
      console.log(`[cancel] Cancellation emails sent`);
    } catch (emailError: any) {
      // Don't fail the cancellation if emails fail
      console.error(`[cancel] Failed to send cancellation emails:`, emailError.message);
    }

    return NextResponse.json({
      ok: true,
      message: "Booking cancelled successfully",
      refundAmount,
      refundType,
      readerWarning,
    });
  } catch (err: any) {
    console.error("[cancel] Error:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to cancel booking" },
      { status: 500 }
    );
  }
}