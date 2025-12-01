'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Booking = {
  id: string;
  actorName: string;
  actorEmail: string;
  startTime: string;
  endTime: string;
  status: string;
  priceCents: number;
  meetingUrl?: string;
  durationMinutes: number;
};

export default function ReaderBookingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming');

  useEffect(() => {
    async function loadData() {
      try {
        // Get current user
        const userRes = await fetch('/api/auth/me');
        if (!userRes.ok) {
          router.push('/login');
          return;
        }
        const userData = await userRes.json();
        
        // Allow both READER and ADMIN roles
        if (userData.user.role !== 'READER' && userData.user.role !== 'ADMIN') {
          router.push('/dashboard');
          return;
        }
        
        setUser(userData.user);

        // Load reader's bookings
        const bookingsRes = await fetch(`/api/bookings?readerId=${userData.user.id}&scope=all`);
        const bookingsData = await bookingsRes.json();

        if (!bookingsRes.ok || !bookingsData.ok) {
          throw new Error(bookingsData.error || 'Failed to load bookings');
        }

        setBookings(bookingsData.bookings || []);
      } catch (err) {
        console.error('Failed to load data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [router]);

  const now = new Date();
  const filteredBookings = bookings.filter(b => {
    const start = new Date(b.startTime);
    if (filter === 'upcoming') return start >= now;
    if (filter === 'past') return start < now;
    return true;
  });

  // Calculate earnings
  const completedEarnings = bookings
    .filter(b => b.status === 'PAID' && new Date(b.startTime) < now)
    .reduce((sum, b) => sum + (b.priceCents * 0.8), 0); // 80% after platform fee
  
  const futureEarnings = bookings
    .filter(b => b.status === 'PAID' && new Date(b.startTime) >= now)
    .reduce((sum, b) => sum + (b.priceCents * 0.8), 0); // Future confirmed earnings

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <Link href="/dashboard" className="text-blue-600 hover:underline text-sm">
              ← Back to Dashboard
            </Link>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p>Loading your bookings...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link href="/dashboard" className="text-blue-600 hover:underline text-sm">
            ← Back to Dashboard
          </Link>
          <Link href="/reader/availability" className="text-sm text-gray-600 hover:text-gray-900">
            Manage Availability →
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Bookings</h1>
          <p className="text-gray-600">Manage your reader sessions and earnings</p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 uppercase">Total Sessions</h3>
            <p className="text-2xl font-bold text-gray-900 mt-2">{bookings.length}</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 uppercase">Upcoming Sessions</h3>
            <p className="text-2xl font-bold text-emerald-600 mt-2">
              {bookings.filter(b => new Date(b.startTime) >= now).length}
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 uppercase">Completed Earnings</h3>
            <p className="text-2xl font-bold text-green-600 mt-2">
              ${(completedEarnings / 100).toFixed(2)}
            </p>
            <p className="text-xs text-gray-500 mt-1">From completed sessions</p>
            {futureEarnings > 0 && (
              <p className="text-xs text-blue-600 mt-1">
                +${(futureEarnings / 100).toFixed(2)} future earnings
              </p>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="flex gap-2 p-4 border-b">
            {(['upcoming', 'past', 'all'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 font-medium capitalize transition rounded-md ${
                  filter === f
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {f} {f === 'upcoming' && `(${bookings.filter(b => new Date(b.startTime) >= now).length})`}
                {f === 'past' && `(${bookings.filter(b => new Date(b.startTime) < now).length})`}
                {f === 'all' && `(${bookings.length})`}
              </button>
            ))}
          </div>
        </div>

        {/* Bookings List */}
        {filteredBookings.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600 mb-4">
              {filter === 'upcoming' 
                ? "You don't have any upcoming sessions."
                : filter === 'past'
                ? "You don't have any past sessions yet."
                : "You haven't received any bookings yet."
              }
            </p>
            <Link href="/reader/availability" className="inline-block bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 transition">
              Manage Availability
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBookings.map(booking => {
              const start = new Date(booking.startTime);
              const end = new Date(booking.endTime);
              const isPast = start < now;
              const earnings = booking.status === 'PAID' ? (booking.priceCents * 0.8) / 100 : 0;

              return (
                <div key={booking.id} className="bg-white border rounded-lg p-6 hover:shadow-md transition">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-semibold mb-1">Session with {booking.actorName}</h3>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          booking.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' :
                          booking.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                          booking.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {booking.status}
                        </span>
                        <span>•</span>
                        <span>{booking.durationMinutes} min</span>
                        <span>•</span>
                        <span>${(booking.priceCents / 100).toFixed(2)}</span>
                        {earnings > 0 && (
                          <>
                            <span>•</span>
                            <span className={`font-medium ${isPast ? 'text-green-600' : 'text-blue-600'}`}>
                              {isPast ? 'You earned:' : 'You will earn:'} ${earnings.toFixed(2)}
                            </span>
                          </>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">Actor: {booking.actorEmail}</p>
                    </div>
                    
                    {isPast && (
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                        Completed
                      </span>
                    )}
                  </div>

                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                    <div>
                      <div className="text-xs text-gray-500 uppercase mb-1">Date & Time</div>
                      <div className="font-medium">
                        {start.toLocaleDateString('en-US', { 
                          weekday: 'short', 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}
                      </div>
                      <div className="text-sm text-gray-600">
                        {start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - 
                        {end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </div>
                    </div>

                    {booking.meetingUrl && (
                      <div>
                        <div className="text-xs text-gray-500 uppercase mb-1">Meeting</div>
                        <a 
                          href={booking.meetingUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className={`inline-block px-4 py-2 rounded-md text-sm font-medium transition ${
                            isPast 
                              ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                              : 'bg-blue-600 hover:bg-blue-700 text-white'
                          }`}
                          onClick={isPast ? (e) => e.preventDefault() : undefined}
                        >
                          {isPast ? 'Session Ended' : 'Join Session'}
                        </a>
                      </div>
                    )}

                    <div>
                      <div className="text-xs text-gray-500 uppercase mb-1">Status</div>
                      <div className="text-sm">
                        {booking.status === 'PAID' && isPast && (
                          <span className="text-green-600">✓ Completed & Paid</span>
                        )}
                        {booking.status === 'PAID' && !isPast && (
                          <span className="text-emerald-600">✓ Confirmed</span>
                        )}
                        {booking.status === 'PENDING' && (
                          <span className="text-yellow-600">⏳ Awaiting Payment</span>
                        )}
                        {booking.status === 'CANCELLED' && (
                          <span className="text-red-600">✗ Cancelled</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {booking.status === 'PAID' && !isPast && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm text-blue-700">
                        💡 <strong>Tip:</strong> Test your camera and microphone before the session. 
                        The actor is counting on you for professional feedback!
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}