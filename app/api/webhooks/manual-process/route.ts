import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { bookingId } = body;

    if (!bookingId) {
      return NextResponse.json({ error: "Missing bookingId" }, { status: 400 });
    }

    console.log(`[Manual Payment Processing] Processing booking ${bookingId}`);

    // Check if booking exists and is pending
    const existingBooking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { 
        status: true, 
        totalCents: true,
        readerEarningsCents: true,
        platformFeeCents: true 
      }
    });

    if (!existingBooking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (existingBooking.status === 'CONFIRMED') {
      console.log(`[Manual Payment Processing] Booking ${bookingId} already confirmed`);
      return NextResponse.json({ 
        success: true, 
        message: "Booking already confirmed",
        status: "CONFIRMED"
      });
    }

    if (existingBooking.status !== 'PENDING') {
      return NextResponse.json({ 
        error: `Booking status is ${existingBooking.status}, cannot process payment` 
      }, { status: 400 });
    }

    // Calculate revenue split if not already set
    const totalCents = existingBooking.totalCents;
    const readerEarningsCents = existingBooking.readerEarningsCents || Math.floor(totalCents * 0.8);
    const platformFeeCents = existingBooking.platformFeeCents || (totalCents - readerEarningsCents);

    console.log(`[Manual Payment Processing] Revenue split - Total: $${totalCents/100}, Reader: $${readerEarningsCents/100}, Platform: $${platformFeeCents/100}`);

    // Update booking to CONFIRMED with payment details
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: { 
        status: "CONFIRMED",
        readerEarningsCents,
        platformFeeCents,
        stripePaymentIntentId: `pi_manual_${Date.now()}_${bookingId.slice(-8)}`
      },
      include: {
        User_Booking_readerIdToUser: {
          select: {
            id: true,
            name: true,
            displayName: true,
            email: true
          }
        },
        User_Booking_actorIdToUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    console.log(`[Manual Payment Processing] ✅ Confirmed booking ${bookingId}`);
    console.log(`[Manual Payment Processing] Reader: ${updatedBooking.User_Booking_readerIdToUser.displayName || updatedBooking.User_Booking_readerIdToUser.name}`);
    console.log(`[Manual Payment Processing] Actor: ${updatedBooking.User_Booking_actorIdToUser.name}`);

    // Send confirmation emails
    try {
      const { sendBookingConfirmation } = await import('@/lib/send-booking-confirmation');
      await sendBookingConfirmation(updatedBooking);
    } catch (emailError) {
      console.error('[Manual Payment Processing] Failed to send emails:', emailError);
    }

    return NextResponse.json({
      success: true,
      message: "Payment processed successfully",
      booking: {
        id: updatedBooking.id,
        status: updatedBooking.status,
        readerEarningsCents: updatedBooking.readerEarningsCents,
        platformFeeCents: updatedBooking.platformFeeCents
      }
    });

  } catch (error) {
    console.error('[Manual Payment Processing] Error:', error);
    return NextResponse.json(
      { error: "Failed to process payment" },
      { status: 500 }
    );
  }
}
