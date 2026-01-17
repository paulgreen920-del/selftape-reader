"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ReaderStatusPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [isReader, setIsReader] = useState(false);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          router.push('/login');
          return;
        }
        const data = await res.json();
        if (data.user) {
          setIsActive(data.user.isActive || false);
          setIsReader(data.user.role === 'READER');
          setUserName(data.user.displayName || data.user.name || '');
          // If not a reader, redirect to dashboard
          if (data.user.role !== 'READER') {
            router.push('/dashboard');
            return;
          }
        }
      } catch (err) {
        console.error('Failed to fetch status:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchStatus();
  }, [router]);

  async function handleToggle() {
    setUpdating(true);
    try {
      const res = await fetch('/api/reader/toggle-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      });
      const data = await res.json();
      if (data.ok) {
        setIsActive(!isActive);
      } else {
        alert(data.error || 'Failed to update status');
      }
    } catch (err) {
      alert('Something went wrong');
    } finally {
      setUpdating(false);
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
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-xl mx-auto px-4">
        <Link 
          href="/dashboard" 
          className="inline-flex items-center text-emerald-600 hover:text-emerald-700 mb-6"
        >
          ← Back to Dashboard
        </Link>
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="px-8 py-6 border-b border-gray-100">
            <h1 className="text-2xl font-bold text-gray-900">Reader Status</h1>
            <p className="text-gray-600 mt-1">Control your visibility in the marketplace</p>
          </div>
          {/* Status Card */}
          <div className="p-8">
            {isActive ? (
              // Active State
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 mb-6">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">🟢</span>
                  <h2 className="text-xl font-bold text-emerald-800">Your profile is Active</h2>
                </div>
                <p className="text-emerald-700 mb-4">
                  You appear in the reader marketplace and actors can book sessions with you.
                </p>
                <button
                  onClick={handleToggle}
                  disabled={updating}
                  className="bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-100 font-medium py-3 px-6 rounded-lg transition-colors disabled:opacity-50"
                >
                  {updating ? 'Updating...' : 'Pause My Profile'}
                </button>
              </div>
            ) : (
              // Paused State
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-6">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">⏸️</span>
                  <h2 className="text-xl font-bold text-amber-800">Your profile is Paused</h2>
                </div>
                <p className="text-amber-700 mb-4">
                  You're hidden from the marketplace. Actors cannot find or book you.
                </p>
                <button
                  onClick={handleToggle}
                  disabled={updating}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 px-6 rounded-lg transition-colors disabled:opacity-50"
                >
                  {updating ? 'Updating...' : 'Go Live'}
                </button>
              </div>
            )}
            {/* Info Section */}
            <div className="space-y-4 text-sm text-gray-600">
              <div className="flex items-start gap-3">
                <span className="text-gray-400">ℹ️</span>
                <p>
                  <strong>Pausing your profile</strong> hides you from the reader marketplace. 
                  Existing confirmed bookings are not affected.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-gray-400">ℹ️</span>
                <p>
                  <strong>Your data is saved.</strong> All your profile information, rates, 
                  availability, and earnings history are preserved. You can go live again anytime.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-gray-400">ℹ️</span>
                <p>
                  <strong>You can still book readers</strong> even while your reader profile is paused.
                </p>
              </div>
            </div>
          </div>
          {/* Quick Links */}
          <div className="px-8 py-6 bg-gray-50 border-t border-gray-100">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Quick Links</h3>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/reader/profile"
                className="text-emerald-600 hover:text-emerald-700 text-sm"
              >
                Edit Reader Profile →
              </Link>
              <Link
                href="/reader/availability"
                className="text-emerald-600 hover:text-emerald-700 text-sm"
              >
                Manage Availability →
              </Link>
              <Link
                href="/reader/earnings"
                className="text-emerald-600 hover:text-emerald-700 text-sm"
              >
                View Earnings →
              </Link>
            </div>
          </div>
        </div>
        {/* Support */}
        <div className="mt-6 text-center">
          <p className="text-gray-500 text-sm">
            Need help? Contact us at{' '}
            <a href="mailto:support@selftapereader.com" className="text-emerald-600 hover:underline">
              support@selftapereader.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
