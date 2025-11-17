import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-10-29.clover",
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const sig = req.headers.get("stripe-signature");

    if (!sig) {
      return NextResponse.json({ error: "No signature" }, { status: 400 });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } catch (err: any) {
      console.error("[webhook] Signature verification failed:", err.message);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    console.log("[webhook] Event type:", event.type);

    // Handle subscription events
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        
        if (session.mode === "subscription" && session.metadata?.type === "reader_subscription") {
          const readerId = session.metadata.readerId;
          const subscriptionId = session.subscription as string;

          // Update user with subscription info and upgrade to READER
          await prisma.user.update({
            where: { id: readerId },
            data: {
              stripeCustomerId: session.customer as string,
              subscriptionId: subscriptionId,
              subscriptionStatus: "active",
              role: "READER",
              isActive: true,
              onboardingStep: null, // Clear onboarding step - user is fully onboarded
            },
          });

          console.log(`[webhook] ✅ Subscription activated and upgraded user ${readerId} to READER`);
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        
        // Find user by subscription ID
        const user = await prisma.user.findFirst({
          where: { subscriptionId: subscription.id },
        });

        if (user) {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              subscriptionStatus: subscription.status,
            },
          });

          console.log(`[webhook] Subscription updated for user ${user.id}: ${subscription.status}`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        
        const user = await prisma.user.findFirst({
          where: { subscriptionId: subscription.id },
        });

        if (user) {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              subscriptionStatus: "canceled",
              isActive: false,
              role: "ACTOR", // Downgrade back to ACTOR
            },
          });

          console.log(`[webhook] Subscription canceled for user ${user.id}, downgraded to ACTOR`);
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("[webhook] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}