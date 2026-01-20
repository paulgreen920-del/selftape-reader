'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          router.push('/login');
          return;
        }
        const data = await res.json();
        if (data.ok) {
          setUser(data.user);
        }
      } catch (err) {
        console.error('Failed to fetch user:', err);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }
    fetchUser();
  }, [router]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <p>Loading...</p>
      </div>
    );
  }

  const isReader = user?.role === 'READER' || user?.isAdmin;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>
      <div className="space-y-6">
        {/* Account Info */}
        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Account</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <dt className="text-gray-600">Name:</dt>
              <dd className="font-medium">{user?.displayName || user?.name}</dd>
            </div>
            <div className="flex justify-between items-center">
              <dt className="text-gray-600">Email:</dt>
              <dd className="font-medium">{user?.email}</dd>
            </div>
            <div className="flex justify-between items-center">
              <dt className="text-gray-600">Account Type:</dt>
              <dd className="font-medium">{isReader ? '📖 Reader' : '🎬 Actor'}</dd>
            </div>
            <div className="flex justify-between items-center">
              <dt className="text-gray-600">Timezone:</dt>
              <dd className="font-medium">{user?.timezone || 'Not set'}</dd>
            </div>
          </dl>
        </div>

        {/* Reader-specific settings */}
        {isReader ? (
          <>
            <div className="bg-white border rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Reader Profile</h2>
              <p className="text-sm text-gray-600 mb-4">Update your profile, rates, and bio</p>
              <Link href="/reader/profile" className="inline-block bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700">
                Edit Profile
              </Link>
            </div>

            <div className="bg-white border rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Availability & Calendar</h2>
              <p className="text-sm text-gray-600 mb-4">Set your weekly availability and connect your calendar</p>
              <Link href="/reader/availability" className="inline-block bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700">
                Manage Availability
              </Link>
            </div>

            <div className="bg-white border rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Payments</h2>
              <p className="text-sm text-gray-600 mb-4">View earnings and manage your Stripe account</p>
              <Link href="/reader/earnings" className="inline-block bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700">
                View Earnings
              </Link>
            </div>
          </>
        ) : (
          /* Actor - show become a reader CTA */
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-2">Become a Reader</h2>
            <p className="text-sm text-gray-600 mb-4">
              Want to help fellow actors with their self-tapes? Join as a reader and earn money 
              while helping others prepare for auditions.
            </p>
            <Link href="/onboarding/reader" className="inline-block bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700">
              Start Reader Onboarding
            </Link>
          </div>
        )}

        {/* Notifications - Coming Soon */}
        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Notifications</h2>
          <p className="text-sm text-gray-600">Email notification preferences coming soon</p>
        </div>
      </div>

      <div className="mt-8">
        <Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">← Back to Dashboard</Link>
      </div>
    </div>
  );
}