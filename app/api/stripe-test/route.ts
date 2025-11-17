// app/api/stripe-test/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";

export async function GET() {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    const balance = await stripe.balance.retrieve();
    return NextResponse.json({ success: true, balance });
  } catch (err: any) {
    console.error("Stripe test failed:", err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
