import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-11-17.clover',
});

export async function POST() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const session = JSON.parse(sessionCookie.value);
    const userId = session.userId;

    // Get user's Stripe account ID
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeAccountId: true },
    });

    if (!user?.stripeAccountId) {
      return NextResponse.json(
        { error: 'No Stripe account connected' },
        { status: 400 }
      );
    }

    // Create login link for Stripe Express Dashboard
    const loginLink = await stripe.accounts.createLoginLink(user.stripeAccountId);

    return NextResponse.json({ url: loginLink.url });
  } catch (error: any) {
    console.error('[stripe/dashboard-link] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create dashboard link' },
      { status: 500 }
    );
  }
}
