import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-11-17.clover",
});

export async function POST(req: Request) {
  try {
    // Get current user from session
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session");

    if (!sessionCookie) {
      return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
    }

    const session = JSON.parse(sessionCookie.value);
    
    if (session.role !== 'READER' && session.role !== 'ADMIN') {
      return NextResponse.json({ ok: false, error: "Not a reader" }, { status: 403 });
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
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

    // If they have an active subscription that's set to cancel, just undo the cancellation
    if (user.subscriptionId && user.subscriptionStatus === "canceling") {
      // Reactivate the existing subscription
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

      console.log(`✅ Reactivated existing subscription for user ${user.id}`);

      return NextResponse.json({ 
        ok: true, 
        message: "Subscription reactivated!" 
      });
    }

    // If they're fully canceled (no active subscription), they need to re-subscribe
    if (!user.subscriptionId || user.subscriptionStatus === "canceled") {
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
    }

    return NextResponse.json({ 
      ok: false, 
      error: "Unable to reactivate - please contact support" 
    }, { status: 400 });

  } catch (err: any) {
    console.error("[subscription/reactivate] Error:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to reactivate subscription" },
      { status: 500 }
    );
  }
}
