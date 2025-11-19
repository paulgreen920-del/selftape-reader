import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export async function GET(req: NextRequest) {
  const accountId = req.nextUrl.searchParams.get('accountId');
  if (!accountId) {
    return NextResponse.json({ ok: false, error: 'Missing accountId' }, { status: 400 });
  }

  try {
    const account = await stripe.accounts.retrieve(accountId);
    return NextResponse.json({
      ok: true,
      details_submitted: account.details_submitted,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      requirements: account.requirements,
      type: account.type,
      country: account.country,
      email: account.email,
      capabilities: account.capabilities,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message || 'Failed to fetch Stripe account' }, { status: 500 });
  }
}
