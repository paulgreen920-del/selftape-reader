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
        if (data.user.role === 'READER') {
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

  const isReader = user.role === 'READER' || user.role === 'ADMIN';
  const isActive = user.isActive !== false;
  const hasIncompleteOnboarding = user.onboardingStep !== null && user.onboardingStep !== undefined;

  // Modal for incomplete onboarding
  function OnboardingModal() {
    const getStepMessage = () => {
      if (user.onboardingStep === 'schedule') {
        return {
          title: 'Complete Your Profile Setup',
          message: 'You need to connect your calendar to continue. This ensures actors can see your real-time availability.',
          buttonText: 'Connect Calendar',
        };
      } else if (user.onboardingStep === 'availability') {
        return {
          title: 'Set Your Availability',
          message: 'Configure your weekly availability schedule so actors can book sessions with you.',
          buttonText: 'Set Availability',
        };
      } else if (user.onboardingStep === 'payment') {
        return {
          title: 'Connect Stripe Account',
          message: 'Connect your Stripe account to receive payments from actors who book sessions.',
          buttonText: 'Connect Stripe',
        };
      } else if (user.onboardingStep === 'subscribe') {
        return {
          title: 'Activate Your Reader Account',
          message: 'Subscribe to activate your profile and start receiving bookings from actors.',
          buttonText: 'Subscribe Now',
        };
      }
      return {
        title: 'Complete Onboarding',
        message: 'Please complete your reader onboarding to access the dashboard.',
        buttonText: 'Continue',
      };
    };

    const { title, message, buttonText } = getStepMessage();

    const handleContinue = () => {
      const step = user.onboardingStep;
      const userId = user.id;
      
      console.log('Continuing onboarding:', { step, userId, fullUser: user });
      
      if (!userId) {
        console.error('No userId available! User object:', user);
        alert('Error: User ID not found. Please try logging out and back in.');
        return;
      }
      
      const targetUrl = step === 'schedule' 
        ? `/onboarding/schedule?readerId=${encodeURIComponent(userId)}`
        : step === 'availability'
        ? `/onboarding/availability?readerId=${encodeURIComponent(userId)}`
        : step === 'payment'
        ? `/onboarding/payment?readerId=${encodeURIComponent(userId)}`
        : step === 'subscribe'
        ? `/onboarding/subscribe?readerId=${encodeURIComponent(userId)}`
        : '/dashboard';
      
      console.log('Navigating to:', targetUrl);
      router.push(targetUrl);
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
          <div className="flex items-center justify-center w-12 h-12 bg-orange-100 rounded-full mx-auto mb-4">
            <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          
          <h2 className="text-xl font-bold text-center mb-2">{title}</h2>
          <p className="text-gray-600 text-center mb-6">{message}</p>
          
          <button
            onClick={handleContinue}
            className="w-full bg-emerald-600 text-white rounded-lg px-4 py-3 font-semibold hover:bg-emerald-700 transition"
          >
            {buttonText}
          </button>
          
          <button
            onClick={handleLogout}
            className="w-full text-sm text-gray-500 hover:text-gray-700 mt-3"
          >
            Sign out instead
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {hasIncompleteOnboarding && <OnboardingModal />}
      
      {/* Show incomplete onboarding banner for readers */}
      {isReader && onboardingStatus && !onboardingStatus.isComplete && (
        <div className="bg-yellow-50 border-b-2 border-yellow-400">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-yellow-800 font-medium">
                  ⚠️ Your profile setup is incomplete. 
                </span>
                <span className="text-yellow-700 ml-2">
                  Complete all steps to start receiving bookings.
                </span>
              </div>
              <Link
                href={onboardingStatus.nextStepUrl || '/onboarding/reader'}
                className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-md text-sm font-medium transition"
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
            {isReader 
              ? "You're signed in as a Reader. Manage your profile and view your bookings below."
              : "You're signed in as an Actor. Browse readers and book your next session!"
            }
          </p>
        </div>

        {!isReader && (
          <div className="bg-gradient-to-r from-orange-50 to-orange-100 border-2 border-orange-200 rounded-lg p-6 mb-8">
            <div className="flex items-start justify-between">
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
                className="ml-4 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition whitespace-nowrap"
              >
                Upgrade to Reader
              </Link>
            </div>
          </div>
        )}

        {isReader && (
          <div className={`border rounded-lg p-6 mb-8 ${
            isActive 
              ? 'bg-gray-100 border-gray-300' 
              : 'bg-red-50 border-red-300'
          }`}>
            <div className="flex items-start justify-between">
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
                className="ml-4 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition whitespace-nowrap"
              >
                Manage Subscription
              </Link>
            </div>
          </div>
        )}

        {isReader && (
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
          {isReader ? (
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
                {isReader ? '📖 Reader' : '🎬 Actor'}
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
            {isReader && (
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