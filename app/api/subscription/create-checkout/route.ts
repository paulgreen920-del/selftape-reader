import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-10-29.clover",
});

export async function POST(req: Request) {
  try {
    const { readerId, email } = await req.json();

    if (!readerId || !email) {
      return NextResponse.json(
        { ok: false, error: "Missing readerId or email" },
        { status: 400 }
      );
    }

    // Create or retrieve Stripe customer
    const customers = await stripe.customers.list({ email, limit: 1 });
    let customer: Stripe.Customer;

    if (customers.data.length > 0) {
      customer = customers.data[0];
    } else {
      customer = await stripe.customers.create({ email });
    }

    // Create checkout session for subscription
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: process.env.STRIPE_READER_PRICE_ID!,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_URL}/onboarding/complete?readerId=${readerId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_URL}/onboarding/payment?readerId=${readerId}&canceled=true`,
      metadata: {
        readerId,
        type: "reader_subscription",
      },
    });

    return NextResponse.json({ ok: true, checkoutUrl: session.url });
  } catch (err: any) {
    console.error("[create-checkout] Error:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to create checkout" },
      { status: 500 }
    );
  }
}