import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-11-17.clover",
});

export async function POST(req: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
    }
    
    if (currentUser.role !== 'READER' && !currentUser.isAdmin) {
      return NextResponse.json({ ok: false, error: "Not a reader" }, { status: 403 });
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: currentUser.id },
      select: {
        id: true,
        subscriptionId: true,
        subscriptionStatus: true,
        isActive: true,
        stripeCustomerId: true,
      },
    });

    if (!user) {
      return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
    }

    console.log(`[reactivate] User ${user.id} - Status: ${user.subscriptionStatus}, SubId: ${user.subscriptionId}`);


    // If they have a subscription, check its actual state with Stripe
    if (user.subscriptionId) {
      const subscription = await stripe.subscriptions.retrieve(user.subscriptionId);
      
      console.log(`[reactivate] Stripe status: ${subscription.status}, cancel_at_period_end: ${subscription.cancel_at_period_end}`);

      // If subscription is active but scheduled to cancel, undo the cancellation
      if (subscription.status === "active" && subscription.cancel_at_period_end) {
        await stripe.subscriptions.update(user.subscriptionId, {
          cancel_at_period_end: false,
        });

        await prisma.user.update({
          where: { id: user.id },
          data: {
            subscriptionStatus: "active",
            isActive: true,
          },
        });

        console.log(`✅ Reactivated subscription for user ${user.id}`);

        return NextResponse.json({ 
          ok: true, 
          message: "Subscription reactivated!" 
        });
      }

      // If subscription is fully canceled or past_due, need new checkout
      if (subscription.status === "canceled" || subscription.status === "past_due" || subscription.status === "unpaid") {
        // Fall through to create new checkout
      } else if (subscription.status === "active" && !subscription.cancel_at_period_end) {
        // Already active, nothing to do
        return NextResponse.json({ 
          ok: true, 
          message: "Subscription is already active!" 
        });
      }
    }

    // Create new checkout session for resubscription
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: user.stripeCustomerId || undefined,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: process.env.STRIPE_READER_PRICE_ID!,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_URL}/settings/subscription?reactivated=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_URL}/settings/subscription`,
      custom_text: {
        submit: {
          message: "Payment processed by Self-tape Reader",
        },
      },
      metadata: {
        userId: user.id,
        type: "reader_resubscription",
      },
    });

    return NextResponse.json({ 
      ok: true, 
      checkoutUrl: checkoutSession.url,
      message: "Redirecting to payment..." 
    });

  } catch (err: any) {
    console.error("[subscription/reactivate] Error:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to reactivate subscription" },
      { status: 500 }
    );
  }
}
