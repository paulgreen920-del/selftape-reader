import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-11-17.clover",
});

export async function POST(req: Request) {
  try {
    const { sessionId, readerId } = await req.json();

    if (!sessionId || !readerId) {
      return NextResponse.json(
        { ok: false, error: "Missing sessionId or readerId" },
        { status: 400 }
      );
    }

    console.log(`[verify-session] Checking session ${sessionId} for user ${readerId}`);

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    console.log('[verify-session] Session status:', session.payment_status);
    console.log('[verify-session] Subscription ID:', session.subscription);

    if (session.payment_status === 'paid' && session.subscription) {
      // Update user with subscription info
      const updated = await prisma.user.update({
        where: { id: readerId },
        data: {
          subscriptionId: session.subscription as string,
          subscriptionStatus: "active",
          stripeCustomerId: session.customer as string,
          onboardingStep: null, // Clear onboarding step
          role: "READER",
          isActive: true,
        },
      });

      console.log(`[verify-session] ✅ Activated subscription for user ${readerId}`);
      
      return NextResponse.json({ 
        ok: true, 
        message: "Subscription activated",
        subscriptionStatus: updated.subscriptionStatus 
      });
    } else {
      console.log('[verify-session] ⚠️ Payment not completed yet');
      return NextResponse.json(
        { ok: false, error: "Payment not completed" },
        { status: 400 }
      );
    }
  } catch (err: any) {
    console.error("[verify-session] Error:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to verify session" },
      { status: 500 }
    );
  }
}
