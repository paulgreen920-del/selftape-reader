'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SubscriptionPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [reader, setReader] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [canceling, setCanceling] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        // Get current user
        const userRes = await fetch('/api/auth/me');
        if (!userRes.ok) {
          router.push('/login');
          return;
        }
        const userData = await userRes.json();
        setUser(userData.user);

        // If reader, get reader details
        if (userData.user.role === 'READER' && userData.user.readerId) {
          const readerRes = await fetch(`/api/readers?id=${userData.user.readerId}`);
          if (readerRes.ok) {
            const readerData = await readerRes.json();
            setReader(readerData.reader);
          }
        }
      } catch (err) {
        console.error('Failed to fetch data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [router]);

  async function handleCancelSubscription() {
    if (!confirm('Are you sure you want to cancel your reader membership? You will lose access to reader features at the end of your billing period.')) {
      return;
    }

    setCanceling(true);
    try {
      const res = await fetch('/api/subscription/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ readerId: user.readerId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to cancel subscription');
      }

      alert('Your subscription has been canceled. You will have access until the end of your billing period.');
      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel subscription');
    } finally {
      setCanceling(false);
    }
  }

  async function handleDowngradeToActor() {
    if (!confirm('Are you sure you want to downgrade to an Actor account? You will lose all reader features immediately and your profile will be removed from the marketplace.')) {
      return;
    }

    setCanceling(true);
    try {
      const res = await fetch('/api/subscription/downgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to downgrade account');
      }

      alert('Your account has been downgraded to Actor. Your subscription has been canceled.');
      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Failed to downgrade account');
    } finally {
      setCanceling(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (user?.role !== 'READER' && user?.role !== 'ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Not a Reader</h1>
          <p className="text-gray-600 mb-4">You don't have an active reader subscription.</p>
          <Link href="/dashboard" className="text-blue-600 hover:underline">
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/dashboard" className="text-blue-600 hover:underline text-sm">
            ← Back to Dashboard
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-8">Subscription Management</h1>

        {/* Current Plan */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Current Plan</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Plan:</span>
              <span className="font-medium">Reader Membership</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Price:</span>
              <span className="font-medium">$9.99 / month</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
              <span className="font-medium text-emerald-600">Active</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Next Billing Date:</span>
              <span className="font-medium">December 11, 2025</span>
            </div>
          </div>
        </div>

        {/* Benefits Reminder */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6 mb-6">
          <h3 className="font-semibold text-emerald-900 mb-3">Your Reader Benefits:</h3>
          <ul className="space-y-2 text-sm text-emerald-800">
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 mt-0.5">✓</span>
              <span>Appear in the reader marketplace</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 mt-0.5">✓</span>
              <span>Receive unlimited bookings</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 mt-0.5">✓</span>
              <span>Keep 80% of your session fees (20% platform fee)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 mt-0.5">✓</span>
              <span>Automated calendar sync & reminders</span>
            </li>
          </ul>
        </div>

        {/* Manage Subscription */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Manage Subscription</h2>
          
          <div className="space-y-4">
            {/* Cancel Subscription */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium mb-2">Cancel Subscription</h3>
              <p className="text-sm text-gray-600 mb-3">
                Cancel your recurring subscription. You'll keep reader access until the end of your current billing period.
              </p>
              <button
                onClick={handleCancelSubscription}
                disabled={canceling}
                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium disabled:opacity-50"
              >
                {canceling ? 'Processing...' : 'Cancel Subscription'}
              </button>
            </div>

            {/* Downgrade to Actor */}
            <div className="border border-red-200 rounded-lg p-4 bg-red-50">
              <h3 className="font-medium text-red-900 mb-2">Downgrade to Actor</h3>
              <p className="text-sm text-red-800 mb-3">
                <strong>Warning:</strong> Downgrading will immediately remove your reader profile, cancel your subscription, and convert your account back to Actor. This action cannot be undone.
              </p>
              <button
                onClick={handleDowngradeToActor}
                disabled={canceling}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium disabled:opacity-50"
              >
                {canceling ? 'Processing...' : 'Downgrade to Actor'}
              </button>
            </div>
          </div>
        </div>

        {/* Help */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-2">Need Help?</h3>
          <p className="text-sm text-blue-800">
            If you're having issues with your subscription or billing, please contact our support team at{' '}
            <a href="mailto:support@selftape-reader.com" className="underline">
              support@selftape-reader.com
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
