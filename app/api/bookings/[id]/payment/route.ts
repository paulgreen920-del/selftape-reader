import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-11-17.clover",
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { bookingId } = body;

    if (!bookingId) {
      return NextResponse.json({ ok: false, error: "Missing bookingId" }, { status: 400 });
    }

    // Get the booking with reader info
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        User_Booking_readerIdToUser: {
          select: {
            id: true,
            displayName: true,
            name: true,
            stripeAccountId: true,
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
      return NextResponse.json({ ok: false, error: "Booking not found" }, { status: 404 });
    }

    if (booking.status !== "PENDING") {
      return NextResponse.json({ ok: false, error: "Booking is not pending payment" }, { status: 400 });
    }

    if (!booking.User_Booking_readerIdToUser.stripeAccountId) {
      return NextResponse.json(
        { ok: false, error: "Reader hasn't set up payments yet" },
        { status: 400 }
      );
    }

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${booking.durationMinutes}-minute session with ${booking.User_Booking_readerIdToUser.displayName || booking.User_Booking_readerIdToUser.name}`,
              description: `${booking.startTime.toLocaleDateString()} at ${booking.startTime.toLocaleTimeString()}`,
            },
            unit_amount: booking.totalCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      allow_promotion_codes: true, // Enables promo code field for beta testers
      success_url: `${process.env.NEXT_PUBLIC_URL}/checkout/success?bookingId=${booking.id}`,
      cancel_url: `${process.env.NEXT_PUBLIC_URL}/sessions`,
      customer_email: booking.User_Booking_actorIdToUser.email,
      custom_text: {
        submit: {
          message: "Payment processed by Self-tape Reader",
        },
      },
      metadata: {
        bookingId: booking.id,
        readerId: booking.User_Booking_readerIdToUser.id,
      },
    });

    console.log("[payment] Stripe session created for booking:", booking.id);
    return NextResponse.json({ ok: true, checkoutUrl: session.url }, { status: 200 });
  } catch (err: any) {
    console.error("[payment] Error:", err);
    return NextResponse.json({ ok: false, error: err.message || "Failed to create payment session" }, { status: 500 });
  }
}