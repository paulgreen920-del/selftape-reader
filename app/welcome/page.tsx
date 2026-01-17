'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function WelcomePage() {
  const router = useRouter();
  const [userName, setUserName] = useState('');

  useEffect(() => {
    // Fetch current user to get their name
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setUserName(data.user?.name?.split(' ')[0] || '');
        }
      } catch (err) {
        // Silent fail - name is optional
      }
    };
    fetchUser();
  }, []);

  const handleBecomeReader = () => {
    router.push('/onboarding/reader');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg w-full">
        {/* Success Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="text-5xl mb-4">🎉</div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            You're all set{userName ? `, ${userName}` : ''}!
          </h1>
          
          <p className="text-gray-600 mb-6">
            Your account is ready. You can now browse and book readers for your self-tape auditions.
          </p>

          <Link
            href="/readers"
            className="inline-block w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Browse Readers
          </Link>
        </div>

        {/* Reader Upsell Card */}
        <div className="mt-6 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">💰</span>
            <h2 className="text-xl font-bold text-gray-900">
              Want to help fellow actors?
            </h2>
          </div>
          
          <p className="text-gray-700 mb-6">
            Support other actors by reading lines for their self-tape auditions—and earn some side money while you're at it. Set your own rates, set your own schedule, work from anywhere.
          </p>

          <ul className="space-y-2 mb-6 text-sm text-gray-600">
            <li className="flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Keep 80% of every session fee</span>
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>FREE for a limited time (normally $9.99/mo)</span>
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Cancel anytime</span>
            </li>
          </ul>

          <div className="space-y-3">
            <button
              onClick={handleBecomeReader}
              className="w-full bg-emerald-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-emerald-700 transition"
            >
              Yes! I want to become a reader
            </button>
            
            <Link
              href="/readers"
              className="block w-full text-center text-gray-500 py-2 text-sm hover:text-gray-700 transition"
            >
              No thanks, I just want to book readers
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
