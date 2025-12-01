'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function StripeManagementPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [accountStatus, setAccountStatus] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStripeAccount() {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        
        // Check various possible locations for stripe account ID
        const user = data.user || data;
        const stripeId = user?.stripeAccountId || user?.stripeConnectAccountId || user?.stripe_account_id;
        
        if (stripeId) {
          setAccountId(stripeId);
          
          // Optionally check account status
          try {
            const statusRes = await fetch('/api/stripe/account-status');
            const statusData = await statusRes.json();
            if (statusData.ok) {
              setAccountStatus(statusData.status || 'connected');
            }
          } catch (err) {
            // Account status check is optional
            setAccountStatus('connected');
          }
        }
      } catch (err) {
        console.error('Failed to fetch Stripe account:', err);
      } finally {
        setPageLoading(false);
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

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <Link href="/dashboard" className="text-blue-600 hover:underline text-sm">
              ← Back to Dashboard
            </Link>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p>Loading Stripe account...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/dashboard" className="text-blue-600 hover:underline text-sm">
            ← Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Stripe Account Management</h1>
        
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
              {/* Show connected status */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-green-800 font-medium">Stripe Account Connected</span>
                </div>
                <p className="text-sm text-green-700 mt-1">
                  Account ID: {accountId.substring(0, 12)}...
                </p>
              </div>

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
      </main>
    </div>
  );
}