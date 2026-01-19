import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-11-17.clover",
});

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: currentUser.id },
      select: {
        id: true,
        role: true,
        isActive: true,
        subscriptionStatus: true,
        subscriptionId: true,
        stripeCustomerId: true,
      },
    });

    if (!user) {
      return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
    }

    // If they're not a reader or don't have a subscription, return basic info
    if ((user.role !== "READER" && user.role !== "ADMIN") || !user.subscriptionId) {
      return NextResponse.json({
        ok: true,
        subscription: {
          status: user.subscriptionStatus || "inactive",
          isActive: user.isActive,
        },
      });
    }

    // Get detailed subscription info from Stripe
    try {
      const subscription = await stripe.subscriptions.retrieve(user.subscriptionId);
      const stripeSubscription = subscription as any; // Cast to bypass strict typing

      return NextResponse.json({
        ok: true,
        subscription: {
          status: stripeSubscription.status,
          isActive: user.isActive,
          currentPeriodEnd: stripeSubscription.current_period_end 
            ? new Date(stripeSubscription.current_period_end * 1000).toISOString()
            : null,
          cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end || false,
        },
      });
    } catch (stripeErr) {
      console.error("[subscription/status] Stripe error:", stripeErr);
      // Fallback to database values if Stripe call fails
      return NextResponse.json({
        ok: true,
        subscription: {
          status: user.subscriptionStatus || "unknown",
          isActive: user.isActive,
        },
      });
    }
  } catch (err: any) {
    console.error("[subscription/status] Error:", err);
    return NextResponse.json({ ok: false, error: "Failed to get status" }, { status: 500 });
  }
}
