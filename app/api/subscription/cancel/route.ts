import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-11-17.clover",
});

async function POST(req: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
    }
    
    if (currentUser.role !== 'READER') {
      return NextResponse.json({ ok: false, error: "Not a reader" }, { status: 403 });
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: currentUser.id },
      select: {
        id: true,
        subscriptionId: true,
      },
    });

    if (!user) {
      return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
    }

    if (!user.subscriptionId) {
      return NextResponse.json({ ok: false, error: "No active subscription found" }, { status: 400 });
    }

    // Cancel the Stripe subscription (at period end - they keep access until then)
    await stripe.subscriptions.update(user.subscriptionId, {
      cancel_at_period_end: true,
    });

    // Update user status to "canceling" but keep them ACTIVE until period ends
    // The webhook will handle marking them inactive when subscription actually ends
    await prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionStatus: "canceling", // Shows it's set to cancel
        // isActive stays TRUE until subscription.deleted webhook fires
      },
    });

    console.log(`✅ Subscription set to cancel at period end for user ${user.id}`);

    return NextResponse.json({ 
      ok: true, 
      message: "Subscription will cancel at the end of your billing period" 
    });
  } catch (err: any) {
    console.error("[subscription/cancel] Error:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to cancel subscription" },
      { status: 500 }
    );
  }
}

export { POST };
