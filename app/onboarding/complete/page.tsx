
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function OnboardingCompletePage() {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkUser() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setUserName(data.user.displayName || data.user.name || '');
            // If already a reader, go to dashboard
            if (data.user.role === 'READER') {
              router.push('/dashboard');
              return;
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch user:', err);
      } finally {
        setLoading(false);
      }
    }
    checkUser();
  }, [router]);

  async function handleBecomeReader() {
    try {
      // Update user role to READER to start reader onboarding
      const res = await fetch('/api/user/become-reader', {
        method: 'POST',
      });
      const data = await res.json();
      if (data.ok) {
        router.push('/onboarding/reader');
      } else {
        alert(data.error || 'Something went wrong');
      }
    } catch (err) {
      alert('Failed to start reader onboarding');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white py-12">
      <div className="max-w-xl mx-auto px-4">
        {/* Success Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center mb-6">
          {/* Celebration emoji */}
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            {`You're all set${userName ? ", " + userName.split(' ')[0] : ''}!`}
          </h1>
          <p className="text-gray-600 mb-8">
            Your account is ready. You can now browse and book readers for your self-tape auditions.
          </p>
          <Link
            href="/readers"
            className="inline-block bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-4 px-8 rounded-full transition-colors"
          >
            Browse Readers
          </Link>
        </div>
        {/* Reader Upsell Card */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-lg p-8 text-white">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">💰</span>
            <h2 className="text-xl font-bold">Want to earn money too?</h2>
          </div>
          <p className="text-slate-300 mb-6">
            Become a reader and get paid to help other actors with their self-tapes. 
            Set your own rates, set your own schedule, work from anywhere.
          </p>
          <div className="space-y-3 mb-8">
            <div className="flex items-center gap-3">
              <span className="text-emerald-400">✓</span>
              <span className="text-slate-200">Free to join — keep 80% of every booking</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-emerald-400">✓</span>
              <span className="text-slate-200">Set your own rates ($15, $25, $50+ per session)</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-emerald-400">✓</span>
              <span className="text-slate-200">Work when you want — you control your schedule</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-emerald-400">✓</span>
              <span className="text-slate-200">Help fellow actors land roles</span>
            </div>
          </div>
          <button
            onClick={handleBecomeReader}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-4 px-6 rounded-full transition-colors mb-4"
          >
            Yes, I want to become a reader
          </button>
          <Link
            href="/dashboard"
            className="block text-center text-slate-400 hover:text-slate-300 text-sm transition-colors"
          >
            Skip for now — I just want to book readers
          </Link>
        </div>
        {/* Reassurance note */}
        <p className="text-center text-gray-500 text-sm mt-6">
          You can always become a reader later from your dashboard.
        </p>
      </div>
    </div>
  );
}
