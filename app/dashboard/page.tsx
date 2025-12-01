'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [onboardingStatus, setOnboardingStatus] = useState<any>(null);

  useEffect(() => {
    async function fetchUser() {
      console.log('🔍 Fetching user...');
      try {
        const res = await fetch('/api/auth/me', {
          cache: 'no-store' // Always get fresh data
        });
        if (!res.ok) {
          console.log('❌ Not authenticated, redirecting to login');
          router.push('/login');
          return;
        }
        const data = await res.json();
        console.log('✅ User loaded:', data.user.email);
        
        setUser(data.user);
        
        // Check onboarding status for readers
        if (data.user.role === 'READER' || data.user.role === 'ADMIN') {
          const onboardingRes = await fetch('/api/onboarding/status');
          if (onboardingRes.ok) {
            const onboardingData = await onboardingRes.json();
            setOnboardingStatus(onboardingData.status);
            // If onboarding not complete and can't access dashboard, redirect
            if (!onboardingData.status.canAccessDashboard && onboardingData.status.nextStepUrl) {
              console.log('⚠️ Onboarding incomplete, redirecting to:', onboardingData.status.nextStepUrl);
              router.push(onboardingData.status.nextStepUrl);
              return;
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch user:', err);
        console.log('❌ Error fetching user, redirecting to login');
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }
    fetchUser();
  }, [router]);

  async function handleLogout() {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      console.log('Logout response:', res.status);
      
      // Trigger auth change event for Navigation component
      window.dispatchEvent(new CustomEvent('auth-change'));
      
      // Force a full page redirect to clear all state
      window.location.href = '/';
    } catch (err) {
      console.error('Logout failed:', err);
      // Force redirect anyway
      window.location.href = '/';
    }
  }

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

  const isReaderOrAdmin = user.role === 'READER' || user.role === 'ADMIN';
  const isActive = user.isActive !== false;


  return (
    <div className="min-h-screen bg-gray-50">
      {/* Onboarding modal removed. Users now use the checklist below to complete onboarding steps. */}
      
      {/* Show incomplete onboarding banner for readers */}
      {isReaderOrAdmin && onboardingStatus && !onboardingStatus.isComplete && (
        <div className="bg-yellow-50 border-b-2 border-yellow-400">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center flex-wrap">
                <span className="text-yellow-800 font-medium">
                  ⚠️ Your profile setup is incomplete. 
                </span>
                <span className="text-yellow-700 ml-2">
                  Complete all steps to start receiving bookings.
                </span>
              </div>
              <Link
                href={onboardingStatus.nextStepUrl || '/onboarding/reader'}
                className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-md text-sm font-medium transition text-center"
              >
                Complete Setup
              </Link>
            </div>
          </div>
        </div>
      )}
      
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-gray-900 hover:text-emerald-600 transition">
            🎬 Self-Tape Reader
          </Link>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-600 hover:text-gray-900 font-medium"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-2">
            Welcome back, {user.name}! 👋
          </h2>
          <p className="text-gray-600">
            {isReaderOrAdmin 
              ? "You're signed in as a Reader. Manage your profile and view your bookings below."
              : "You're signed in as an Actor. Browse readers and book your next session!"
            }
          </p>
        </div>

        {!(user.role === 'READER' || user.role === 'ADMIN') && (
          <div className="bg-gradient-to-r from-orange-50 to-orange-100 border-2 border-orange-200 rounded-lg p-6 mb-8">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-orange-900 mb-2">
                  🎭 Want to become a Reader?
                </h3>
                <p className="text-sm text-orange-800 mb-4">
                  Earn money helping other actors with their self-tapes. Set your own rates, 
                  manage your availability, and keep 80% of your session fees (20% platform fee).
                </p>
                <ul className="text-sm text-orange-700 space-y-1 mb-4">
                  <li>✓ $9.99/month subscription</li>
                  <li>✓ Appear in the marketplace</li>
                  <li>✓ Set your own hourly rates</li>
                  <li>✓ Flexible scheduling</li>
                </ul>
              </div>
              <Link
                href="/onboarding/reader"
                className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition whitespace-nowrap text-center"
              >
                Upgrade to Reader
              </Link>
            </div>
          </div>
        )}


        {isReaderOrAdmin && (
          <div className={`border rounded-lg p-6 mb-8 ${
            isActive 
              ? 'bg-gray-100 border-gray-300' 
              : 'bg-red-50 border-red-300'
          }`}>
            {/* Header with status and button - stacks on mobile */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Reader Membership
                </h3>
                <p className="text-sm text-gray-600 mb-2">
                  Status: <span className={`font-medium ${
                    isActive ? 'text-emerald-600' : 'text-red-600'
                  }`}>
                    {isActive ? '🟢 Active' : '🔴 Inactive'}
                  </span>
                </p>
                <p className="text-sm text-gray-600">
                  {isActive 
                    ? "Your reader profile is live and accepting bookings. You'll be charged $9.99/month."
                    : "Your reader profile is inactive and not visible to actors. Reactivate to start accepting bookings."
                  }
                </p>
              </div>
              <Link
                href="/settings/subscription"
                className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition whitespace-nowrap text-center w-full sm:w-auto"
              >
                Manage Subscription
              </Link>
            </div>
            {/* Onboarding Checklist */}
            {onboardingStatus && (
              <div className="mt-8">
                <h4 className="text-lg font-semibold mb-3">Onboarding Checklist</h4>
                <ul className="divide-y divide-gray-200">
                  {[
  { key: 'account-created', label: '1. Email & Password', url: '/signup' },
  { key: 'email-verified', label: '2. Email Verification', url: '/verify-email' },
  { key: 'profile-completed', label: '3. Profile Information', url: '/onboarding/reader' },
  { key: 'calendar-connected', label: '4. Connect Calendar', url: '/onboarding/schedule' },
  { key: 'availability-set', label: '5. Availability', url: '/onboarding/availability' },
  { key: 'stripe-connected', label: '6. Create Stripe Account', url: '/onboarding/payment' },
  { key: 'subscription-active', label: '7. Pay Subscription', url: '/onboarding/subscribe' },
].map((step) => {
                    const isDone = onboardingStatus.completedSteps?.includes(step.key);
                    return (
                      <li key={step.key} className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 gap-1">
                        <span className="flex items-center gap-2">
                          <span className={`inline-block w-3 h-3 rounded-full flex-shrink-0 ${isDone ? 'bg-emerald-500' : 'bg-gray-300'}`}></span>
                          <span className={isDone ? 'text-emerald-700 font-medium' : 'text-gray-700'}>{step.label}</span>
                        </span>
                        <span className="flex items-center gap-2 ml-5 sm:ml-0">
                          <span className={`text-xs ${isDone ? 'text-emerald-600' : 'text-red-500'}`}>{isDone ? 'Completed' : 'Incomplete'}</span>
                          {!isDone && (
                            <Link href={step.url} className="text-blue-600 hover:underline text-xs">Click to complete</Link>
                          )}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        )}

        {isReaderOrAdmin && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Reader Dashboard</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <Link
                href="/reader/profile"
                className="bg-white rounded-lg shadow p-6 hover:shadow-md transition"
              >
                <h3 className="text-lg font-semibold mb-2 text-emerald-700">
                  📝 Edit Profile
                </h3>
                <p className="text-sm text-gray-600">
                  Update your bio, rates, availability, and more
                </p>
              </Link>

              <Link
                href="/reader/bookings"
                className="bg-white rounded-lg shadow p-6 hover:shadow-md transition"
              >
                <h3 className="text-lg font-semibold mb-2 text-emerald-700">
                  📅 Reader Bookings
                </h3>
                <p className="text-sm text-gray-600">
                  Sessions where you're the reader
                </p>
              </Link>

              <Link
                href="/reader/availability"
                className="bg-white rounded-lg shadow p-6 hover:shadow-md transition"
              >
                <h3 className="text-lg font-semibold mb-2 text-emerald-700">
                  🗓️ Manage Availability
                </h3>
                <p className="text-sm text-gray-600">
                  Set your schedule and block out time
                </p>
              </Link>

              <Link
                href="/reader/earnings"
                className="bg-white rounded-lg shadow p-6 hover:shadow-md transition"
              >
                <h3 className="text-lg font-semibold mb-2 text-emerald-700">
                  💰 Earnings
                </h3>
                <p className="text-sm text-gray-600">
                  View your session history and payments
                </p>
              </Link>

              {/* Manage Stripe Account tile */}
              <Link
                href="/reader/stripe"
                className="bg-white rounded-lg shadow p-6 hover:shadow-md transition md:col-span-2"
              >
                <h3 className="text-lg font-semibold mb-2 text-emerald-700">
                  🏦 Manage Stripe Account
                </h3>
                <p className="text-sm text-gray-600">
                  Update your payout details, view Stripe dashboard, or manage your connected account.
                </p>
              </Link>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {isReaderOrAdmin ? (
            <>
              <div className="mb-4 col-span-full">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Actor Dashboard</h2>
                <p className="text-sm text-gray-600 mb-4">
                  As a reader, you can also book sessions with other readers for your own self-tape needs.
                </p>
              </div>
              
              <Link
                href="/readers"
                className="bg-white rounded-lg shadow p-6 hover:shadow-md transition"
              >
                <h3 className="text-lg font-semibold mb-2 text-blue-700">
                  🔍 Find Readers
                </h3>
                <p className="text-sm text-gray-600">
                  Book sessions with other readers for your auditions
                </p>
              </Link>

              <Link
                href="/sessions"
                className="bg-white rounded-lg shadow p-6 hover:shadow-md transition"
              >
                <h3 className="text-lg font-semibold mb-2 text-blue-700">
                  🎬 My Actor Sessions
                </h3>
                <p className="text-sm text-gray-600">
                  Sessions where you're the actor
                </p>
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/readers"
                className="bg-white rounded-lg shadow p-6 hover:shadow-md transition"
                onClick={() => console.log('🖱️ Find Readers clicked!')}
              >
                <h3 className="text-lg font-semibold mb-2 text-blue-700">
                  🔍 Find Readers
                </h3>
                <p className="text-sm text-gray-600">
                  Browse available readers and book a session
                </p>
              </Link>

              <Link
                href="/sessions"
                className="bg-white rounded-lg shadow p-6 hover:shadow-md transition"
              >
                <h3 className="text-lg font-semibold mb-2 text-blue-700">
                  📅 My Sessions
                </h3>
                <p className="text-sm text-gray-600">
                  View your upcoming and past sessions
                </p>
              </Link>

              <Link
                href="/settings"
                className="bg-white rounded-lg shadow p-6 hover:shadow-md transition"
              >
                <h3 className="text-lg font-semibold mb-2 text-blue-700">
                  ⚙️ Settings
                </h3>
                <p className="text-sm text-gray-600">
                  Update your account preferences
                </p>
              </Link>

              <Link
                href="/help"
                className="bg-white rounded-lg shadow p-6 hover:shadow-md transition"
              >
                <h3 className="text-lg font-semibold mb-2 text-blue-700">
                  💬 Help & Support
                </h3>
                <p className="text-sm text-gray-600">
                  Get help and contact support
                </p>
              </Link>
            </>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Account Information</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-600">Name:</dt>
              <dd className="font-medium">{user.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">Email:</dt>
              <dd className="font-medium">{user.email}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">Account Type:</dt>
              <dd className="font-medium">
                {(user.role === 'READER' || user.role === 'ADMIN') ? '📖 Reader' : '🎬 Actor'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">Status:</dt>
              <dd className={`font-medium ${
                isActive ? 'text-emerald-600' : 'text-red-600'
              }`}>
                {isActive ? '🟢 Active' : '🔴 Inactive'}
              </dd>
            </div>
            {(user.role === 'READER' || user.role === 'ADMIN') && (
              <div className="flex justify-between">
                <dt className="text-gray-600">Member Since:</dt>
                <dd className="font-medium">November 2025</dd>
              </div>
            )}
          </dl>
        </div>
      </main>
    </div>
  );
}