'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function GoLivePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleActivate = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/reader/activate', {
        method: 'POST',
      });

      const data = await res.json();

      if (data.ok) {
        router.push('/dashboard?activated=true');
      } else {
        setError(data.error || 'Failed to activate');
      }
    } catch (err) {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white py-12">
      <div className="max-w-xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="text-6xl mb-6">🎬</div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            You're Ready to Go Live!
          </h1>
          
          <p className="text-gray-600 mb-8">
            Your profile is complete. Once you activate, actors will be able to find and book you for self-tape reading sessions.
          </p>

          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 mb-8">
            <h2 className="font-semibold text-emerald-800 mb-2">What happens next:</h2>
            <ul className="text-left text-emerald-700 space-y-2">
              <li>✓ Your profile appears in the reader marketplace</li>
              <li>✓ Actors can book sessions based on your availability</li>
              <li>✓ You keep 80% of every booking</li>
              <li>✓ Payments go directly to your connected Stripe account</li>
            </ul>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
              {error}
            </div>
          )}

          <button
            onClick={handleActivate}
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 px-8 rounded-full text-xl transition-all disabled:opacity-50"
          >
            {loading ? 'Activating...' : '🚀 Activate My Profile'}
          </button>

          <p className="text-gray-500 mt-6 text-sm">
            Free to join. No subscription required.
          </p>

          <Link href="/reader" className="text-emerald-600 hover:underline mt-4 inline-block">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
