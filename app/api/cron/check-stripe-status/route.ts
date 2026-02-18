import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-11-17.clover",
});

export async function GET(req: Request) {
  try {
    // Verify cron secret (Vercel sends this)
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all readers with Stripe accounts who are currently active
    const readers = await prisma.user.findMany({
      where: {
        role: { in: ["READER", "ADMIN"] },
        stripeAccountId: { not: null },
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        stripeAccountId: true,
      },
    });

    console.log(`[check-stripe-status] Checking ${readers.length} active readers`);

    let deactivated = 0;
    const deactivatedList: string[] = [];

    for (const reader of readers) {
      try {
        const account = await stripe.accounts.retrieve(reader.stripeAccountId!);
        
        if (!account.charges_enabled) {
          // Stripe restricted - deactivate reader
          await prisma.user.update({
            where: { id: reader.id },
            data: { isActive: false },
          });
          console.log(`[check-stripe-status] Deactivated ${reader.email} - Stripe restricted`);
          deactivatedList.push(reader.email!);
          deactivated++;
        }

        // 200ms delay to avoid Stripe rate limits
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (err: any) {
        console.error(`[check-stripe-status] Error checking ${reader.email}:`, err.message);
      }
    }

    // Invalidate readers cache so changes show immediately
    const cacheResponse = await fetch(`${process.env.NEXT_PUBLIC_URL}/api/readers/available`, {
      method: 'POST',
    }).catch(() => null);

    return NextResponse.json({ 
      ok: true, 
      checked: readers.length,
      deactivated,
      deactivatedList,
    });
  } catch (err: any) {
    console.error("[check-stripe-status] Error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
