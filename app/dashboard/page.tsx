'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch('/api/auth/me', { cache: 'no-store' });
        if (!res.ok) {
          router.push('/login');
          return;
        }
        const data = await res.json();
        setUser(data.user);
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
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Derive role booleans from user object
  const isActor = user.role === 'ACTOR';
  const isReader = user.role === 'READER';
  const isActive = user.isActive === true;
  const isAdmin = user.isAdmin === true;

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user.displayName || user.name || 'there'}!
          </h1>
          <p className="text-gray-600 mt-1">
            {isReader ? 'Manage your reader profile and bookings' : 'Find readers for your self-tape auditions'}
          </p>
        </div>

        {/* Actor Section - Everyone sees this */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Actor Tools</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <Link 
              href="/readers" 
              className="bg-white rounded-lg shadow p-6 hover:shadow-md transition border border-gray-100"
            >
              <h3 className="text-lg font-semibold mb-2 text-blue-700">🔍 Find Readers</h3>
              <p className="text-sm text-gray-600">Browse available readers and book a session</p>
            </Link>
            <Link 
              href="/sessions" 
              className="bg-white rounded-lg shadow p-6 hover:shadow-md transition border border-gray-100"
            >
              <h3 className="text-lg font-semibold mb-2 text-blue-700">📅 My Sessions</h3>
              <p className="text-sm text-gray-600">View your upcoming and past sessions</p>
            </Link>
            <Link 
              href="/settings" 
              className="bg-white rounded-lg shadow p-6 hover:shadow-md transition border border-gray-100 md:col-span-2"
            >
              <h3 className="text-lg font-semibold mb-2 text-blue-700">👤 My Profile</h3>
              <p className="text-sm text-gray-600">Update your account and profile info</p>
            </Link>
          </div>
        </section>

        {/* Become a Reader CTA - Only for Actors */}
        {isActor && (
          <section className="mb-8">
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-xl p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-emerald-900 mb-1">
                    💰 Want to help fellow actors?
                  </h3>
                  <p className="text-sm text-emerald-700">
                    Support other actors by reading lines for their self-tape auditions. Set your own schedule, work from anywhere—and earn some side money while you're at it.
                  </p>
                </div>
                <Link 
                  href="/onboarding/reader" 
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition whitespace-nowrap text-center"
                >
                  Become a Reader
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Reader Section - Only for Readers */}
        {isReader && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Reader Tools</h2>
              <Link 
                href="/reader/status" 
                className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
                  isActive 
                    ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' 
                    : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                }`}
              >
                {isActive ? '🟢 Active' : '⏸️ Paused'} — Manage Status
              </Link>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              <Link 
                href="/reader/bookings" 
                className="bg-white rounded-lg shadow p-6 hover:shadow-md transition border border-gray-100"
              >
                <h3 className="text-lg font-semibold mb-2 text-emerald-700">📅 My Bookings</h3>
                <p className="text-sm text-gray-600">Sessions where you're the reader</p>
              </Link>
              <Link 
                href="/reader/availability" 
                className="bg-white rounded-lg shadow p-6 hover:shadow-md transition border border-gray-100"
              >
                <h3 className="text-lg font-semibold mb-2 text-emerald-700">🗓️ My Availability</h3>
                <p className="text-sm text-gray-600">Set your schedule and available times</p>
              </Link>
              <Link 
                href="/reader/earnings" 
                className="bg-white rounded-lg shadow p-6 hover:shadow-md transition border border-gray-100"
              >
                <h3 className="text-lg font-semibold mb-2 text-emerald-700">💵 My Earnings</h3>
                <p className="text-sm text-gray-600">View your payment history</p>
              </Link>
              <Link 
                href="/reader/profile" 
                className="bg-white rounded-lg shadow p-6 hover:shadow-md transition border border-gray-100"
              >
                <h3 className="text-lg font-semibold mb-2 text-emerald-700">⚙️ Reader Profile</h3>
                <p className="text-sm text-gray-600">Edit rates, bio, and preferences</p>
              </Link>
            </div>
          </section>
        )}

        {/* Admin Section - Only for Admins */}
        {isAdmin && (
          <section className="mb-8">
            <Link 
              href="/admin" 
              className="block bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg p-4 text-center transition"
            >
              🔧 Go to Admin Dashboard
            </Link>
          </section>
        )}

        {/* Account Info Card */}
        <section>
          <div className="bg-white rounded-lg shadow p-6 border border-gray-100">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Account Information</h3>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-600">Name:</dt>
                <dd className="font-medium text-gray-900">{user.displayName || user.name || '-'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Email:</dt>
                <dd className="font-medium text-gray-900">{user.email}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Account Type:</dt>
                <dd className="font-medium text-gray-900">
                  {isReader ? '📖 Reader' : '🎬 Actor'}
                  {isAdmin && ' (Admin)'}
                </dd>
              </div>
              {isReader && (
                <div className="flex justify-between">
                  <dt className="text-gray-600">Reader Status:</dt>
                  <dd className={`font-medium ${isActive ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {isActive ? '🟢 Active' : '⏸️ Paused'}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </section>

      </main>
    </div>
  );
}