'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function StripeManagementPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [accountId, setAccountId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStripeAccount() {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (data.user?.stripeAccountId) {
          setAccountId(data.user.stripeAccountId);
        }
      } catch (err) {
        console.error('Failed to fetch Stripe account:', err);
      }
    }
    fetchStripeAccount();
  }, []);

  async function openStripeDashboard() {
    setLoading(true);
    try {
      const res = await fetch('/api/stripe/dashboard-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      const data = await res.json();
      
      if (!res.ok || !data.url) {
        throw new Error(data.error || 'Failed to get dashboard link');
      }

      window.open(data.url, '_blank');
    } catch (err: any) {
      alert(err.message || 'Failed to open Stripe dashboard');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Stripe Account Management</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Your Stripe Account</h2>
          
          {!accountId ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800">
                You haven't connected a Stripe account yet. Complete onboarding to set up payments.
              </p>
              <button
                onClick={() => router.push('/onboarding/payment')}
                className="mt-4 bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700"
              >
                Connect Stripe Account
              </button>
            </div>
          ) : (
            <>
              <p className="text-gray-600 mb-6">
                Manage your Stripe account, view payouts, update banking details, and create promotional codes for your sessions.
              </p>

              <div className="space-y-4">
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-2">Stripe Express Dashboard</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Access your full Stripe account to:
                  </p>
                  <ul className="text-sm text-gray-700 space-y-2 mb-4">
                    <li>✓ View transaction history and payouts</li>
                    <li>✓ Update bank account details</li>
                    <li>✓ Create promotional codes (discounts for your sessions)</li>
                    <li>✓ View analytics and reports</li>
                    <li>✓ Manage tax information</li>
                  </ul>
                  <button
                    onClick={openStripeDashboard}
                    disabled={loading}
                    className="bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 disabled:opacity-50 font-semibold"
                  >
                    {loading ? 'Opening...' : 'Open Stripe Dashboard'}
                  </button>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">💡 Creating Promo Codes</h3>
                  <p className="text-sm text-blue-800 mb-2">
                    To create promotional codes for your sessions:
                  </p>
                  <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                    <li>Click "Open Stripe Dashboard" above</li>
                    <li>Navigate to "Products" → "Coupons"</li>
                    <li>Create a new coupon (e.g., 50% off, $10 off)</li>
                    <li>Generate a promotion code from that coupon</li>
                    <li>Share the code with actors who book with you!</li>
                  </ol>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => router.push('/dashboard')}
            className="border rounded px-4 py-2 hover:bg-gray-50"
          >
            ← Back to Dashboard
          </button>
        </div>
      </main>
    </div>
  );
}
