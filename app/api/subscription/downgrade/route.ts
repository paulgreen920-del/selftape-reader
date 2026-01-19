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
    });

    if (!user) {
      return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
    }

    // Cancel Stripe subscription immediately if exists
    if (user.subscriptionId) {
      try {
        await stripe.subscriptions.cancel(user.subscriptionId);
      } catch (err) {
        console.error("Failed to cancel Stripe subscription:", err);
        // Continue anyway - we'll clean up manually if needed
      }
    }

    // Update user: deactivate reader profile and change role back to ACTOR
    await prisma.user.update({
      where: { id: user.id },
      data: {
        role: "ACTOR",
        isActive: false,
        subscriptionStatus: "canceled",
      },
    });

    // Update session cookie
    const updatedSession = {
      ...session,
      role: "ACTOR",
    };

    const response = NextResponse.json({ ok: true, message: "Downgraded to actor" });

    response.cookies.set("session", JSON.stringify(updatedSession), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return response;
  } catch (err: any) {
    console.error("[subscription/downgrade] Error:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to downgrade account" },
      { status: 500 }
    );
  }
}

export { POST };
