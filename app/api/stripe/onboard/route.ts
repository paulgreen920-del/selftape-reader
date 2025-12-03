import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-11-17.clover",
});

export async function POST(req: Request) {
  try {
    // Get user from session cookie
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session");

    if (!sessionCookie?.value) {
      return NextResponse.json(
        { ok: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Parse session to get userId
    let userId: string;
    try {
      const session = JSON.parse(sessionCookie.value);
      userId = session.userId;
    } catch {
      return NextResponse.json(
        { ok: false, error: "Invalid session" },
        { status: 401 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { ok: false, error: "No user in session" },
        { status: 401 }
      );
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, stripeAccountId: true },
    });

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "User not found" },
        { status: 404 }
      );
    }

    let accountId = user.stripeAccountId;

    // Create Stripe Connect account if doesn't exist
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        email: user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_profile: {
          mcc: "7392",
          product_description: "Professional reading services for actors' self-tape auditions",
          url: "https://selftape-reader.com",
        },
        business_type: "individual",
        metadata: {
          industry: "Consulting Services",
        },
      });

      accountId = account.id;

      // Save to database
      await prisma.user.update({
        where: { id: userId },
        data: { stripeAccountId: accountId },
      });
    }

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${process.env.NEXT_PUBLIC_URL}/onboarding/payment`,
      return_url: `${process.env.NEXT_PUBLIC_URL}/onboarding/payment`,
      type: "account_onboarding",
    });

    return NextResponse.json({ ok: true, url: accountLink.url }, { status: 200 });
  } catch (err: any) {
    console.error("[stripe/onboard] Error:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to create Stripe account" },
      { status: 500 }
    );
  }
}