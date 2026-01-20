'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Session = {
  id: string;
  readerId: string;
  readerName: string;
  startTime: string;
  endTime: string;
  status: string;
  totalCents: number;
  meetingUrl?: string;
  durationMinutes: number;
};

type SortOption = 'soonest' | 'furthest';

export default function ActorSessionsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming');
  const [paymentLoading, setPaymentLoading] = useState<string | null>(null);
  const [cancelLoading, setCancelLoading] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('soonest');

  useEffect(() => {
    async function loadSessions() {
      try {
        const res = await fetch('/api/sessions');
        const data = await res.json();

        if (!res.ok || !data.ok) {
          if (res.status === 401) {
            router.push('/login');
            return;
          }
          throw new Error(data.error || 'Failed to load sessions');
        }

        setSessions(data.sessions || []);
      } catch (err) {
        console.error('Failed to load sessions:', err);
      } finally {
        setLoading(false);
      }
    }

    loadSessions();
  }, [router]);

  async function completePayment(sessionId: string) {
    setPaymentLoading(sessionId);
    try {
      const res = await fetch(`/api/bookings/${sessionId}/payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bookingId: sessionId }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Failed to create payment session');
      }

      // Redirect to Stripe Checkout
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch (err) {
      console.error('Payment error:', err);
      alert('Failed to start payment process. Please try again.');
    } finally {
      setPaymentLoading(null);
    }
  }

  async function cancelSession(sessionId: string) {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;

    const confirmed = window.confirm(
      `Are you sure you want to cancel your session with ${session.readerName}?\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    setCancelLoading(sessionId);
    try {
      const res = await fetch(`/api/bookings/${sessionId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Failed to cancel session');
      }

      // Update the session status locally
      setSessions(prev => 
        prev.map(s => 
          s.id === sessionId ? { ...s, status: 'CANCELLED' } : s
        )
      );

      alert('Session cancelled successfully.');
    } catch (err: any) {
      console.error('Cancel error:', err);
      alert(err.message || 'Failed to cancel session. Please try again.');
    } finally {
      setCancelLoading(null);
    }
  }

  const now = new Date();
  
  // Filter by tab (upcoming/past/all)
  let filteredSessions = sessions.filter(s => {
    const start = new Date(s.startTime);
    if (filter === 'upcoming') return start >= now;
    if (filter === 'past') return start < now;
    return true;
  });

  // Filter by search term
  if (searchTerm.trim()) {
    const term = searchTerm.toLowerCase();
    filteredSessions = filteredSessions.filter(s =>
      s.readerName.toLowerCase().includes(term)
    );
  }

  // Sort
  filteredSessions.sort((a, b) => {
    const dateA = new Date(a.startTime).getTime();
    const dateB = new Date(b.startTime).getTime();
    return sortBy === 'soonest' ? dateA - dateB : dateB - dateA;
  });

  // Helper to check if session can be cancelled/rescheduled (more than 2 hours away)
  function canModify(session: Session): boolean {
    const start = new Date(session.startTime);
    const hoursUntil = (start.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntil >= 2 && (session.status === 'PAID' || session.status === 'CONFIRMED');
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <Link href="/dashboard" className="text-blue-600 hover:underline text-sm">
            ← Back to Dashboard
          </Link>
        </div>
        <p>Loading your sessions...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Back to Dashboard Link */}
      <div className="mb-6">
        <Link href="/dashboard" className="text-blue-600 hover:underline text-sm">
          ← Back to Dashboard
        </Link>
      </div>
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Sessions</h1>
        <p className="text-gray-600">View your upcoming and past reader sessions</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4 border-b">
        {(['upcoming', 'past', 'all'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 font-medium capitalize transition ${
              filter === f
                ? 'border-b-2 border-emerald-600 text-emerald-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Search and Sort Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1">
          <svg 
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by reader name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white"
        >
          <option value="soonest">Soonest first</option>
          <option value="furthest">Furthest first</option>
        </select>
      </div>

      {filteredSessions.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <p className="text-gray-600 mb-4">
            {searchTerm
              ? `No sessions found matching "${searchTerm}"`
              : filter === 'upcoming' 
                ? "You don't have any upcoming sessions."
                : filter === 'past'
                  ? "You don't have any past sessions."
                  : "You haven't booked any sessions yet."
            }
          </p>
          {!searchTerm && (
            <Link href="/readers" className="inline-block bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700">
              Find a Reader
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSessions.map(session => {
            const start = new Date(session.startTime);
            const end = new Date(session.endTime);
            const isPast = start < now;
            const modifiable = canModify(session);

            return (
              <div key={session.id} className="bg-white border rounded-lg p-4 sm:p-6 hover:shadow-md transition">
                {/* Status Badge */}
                <div className="mb-3">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                    session.status === 'PAID' || session.status === 'CONFIRMED' ? 'bg-emerald-100 text-emerald-700' :
                    session.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                    session.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>{session.status}</span>
                </div>

                {/* Title, Duration, Price */}
                <div className="mb-3">
                  <h3 className="text-lg sm:text-xl font-semibold mb-2">Session with {session.readerName}</h3>
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {session.durationMinutes} min
                    </span>
                    <span className="flex items-center gap-1 font-semibold text-gray-900">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      ${(session.totalCents / 100).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Date & Time */}
                <div className="mb-4 pb-4 border-b">
                  <div className="flex items-start gap-2 text-sm">
                    <svg className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <div>
                      <div className="font-medium text-gray-900">{start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</div>
                      <div className="text-gray-600">{start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - {end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2">
                  {session.status === 'PENDING' && (
                    <button
                      onClick={() => completePayment(session.id)}
                      disabled={paymentLoading === session.id}
                      className="w-full px-4 py-3 bg-emerald-600 text-white text-center text-sm font-semibold rounded-lg hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {paymentLoading === session.id ? 'Processing...' : 'Complete Payment'}
                    </button>
                  )}
                  
                  {session.meetingUrl && (session.status === 'PAID' || session.status === 'CONFIRMED') && !isPast && (
                    <a 
                      href={session.meetingUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="block w-full px-4 py-3 bg-blue-600 text-white text-center text-sm font-semibold rounded-lg hover:bg-blue-700 transition"
                    >
                      Join Session
                    </a>
                  )}

                  {/* Reschedule & Cancel Buttons */}
                  {modifiable && (
                    <div className="flex gap-2 pt-2">
                      <Link
                        href={`/bookings/${session.id}/reschedule`}
                        className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 text-center text-sm font-medium rounded-lg hover:bg-gray-200 transition"
                      >
                        Reschedule
                      </Link>
                      <button
                        onClick={() => cancelSession(session.id)}
                        disabled={cancelLoading === session.id}
                        className="flex-1 px-4 py-2 bg-red-50 text-red-600 text-center text-sm font-medium rounded-lg hover:bg-red-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {cancelLoading === session.id ? 'Cancelling...' : 'Cancel'}
                      </button>
                    </div>
                  )}

                  {/* Info message for sessions within 2 hours */}
                  {!isPast && (session.status === 'PAID' || session.status === 'CONFIRMED') && !modifiable && (
                    <p className="text-xs text-gray-500 text-center pt-2">
                      Sessions cannot be modified within 2 hours of start time
                    </p>
                  )}
                  
                  <Link 
                    href={`/reader/${session.readerId}/profile`} 
                    className="block text-center text-sm text-gray-600 hover:text-gray-900 py-2 transition"
                  >
                    View Reader Profile →
                  </Link>
                </div>

                {/* Cancelled status */}
                {session.status === 'CANCELLED' && (
                  <div className="mt-2 text-center py-2 text-sm text-red-500">
                    This session has been cancelled
                  </div>
                )}

                {/* Past session indicator */}
                {isPast && session.status !== 'CANCELLED' && (
                  <div className="mt-2 text-center py-2 text-sm text-gray-500">
                    Session completed
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}