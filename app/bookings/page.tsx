'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Booking = {
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

export default function ActorBookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming');

  useEffect(() => {
    async function loadBookings() {
      try {
        const res = await fetch('/api/bookings/actor');
        const data = await res.json();

        if (!res.ok || !data.ok) {
          if (res.status === 401) {
            router.push('/login');
            return;
          }
          throw new Error(data.error || 'Failed to load bookings');
        }

        setBookings(data.bookings || []);
      } catch (err) {
        console.error('Failed to load bookings:', err);
      } finally {
        setLoading(false);
      }
    }

    loadBookings();
  }, [router]);

  const now = new Date();
  const filteredBookings = bookings.filter(b => {
    const start = new Date(b.startTime);
    if (filter === 'upcoming') return start >= now;
    if (filter === 'past') return start < now;
    return true;
  });

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <p>Loading your bookings...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Bookings</h1>
        <p className="text-gray-600">View your upcoming and past reader sessions</p>
      </div>

      <div className="flex gap-2 mb-6 border-b">
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

      {filteredBookings.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <p className="text-gray-600 mb-4">
            {filter === 'upcoming' 
              ? "You don't have any upcoming sessions."
              : filter === 'past'
              ? "You don't have any past sessions."
              : "You haven't booked any sessions yet."
            }
          </p>
          <Link href="/readers" className="inline-block bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700">
            Find a Reader
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBookings.map(booking => {
            const start = new Date(booking.startTime);
            const end = new Date(booking.endTime);

            return (
              <div key={booking.id} className="bg-white border rounded-lg p-4 sm:p-6 hover:shadow-md transition">
                {/* Status Badge */}
                <div className="mb-3">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                    booking.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' :
                    booking.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>{booking.status}</span>
                </div>

                {/* Title, Duration, Price */}
                <div className="mb-3">
                  <h3 className="text-lg sm:text-xl font-semibold mb-2">Session with {booking.readerName}</h3>
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {booking.durationMinutes} min
                    </span>
                    <span className="flex items-center gap-1 font-semibold text-gray-900">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      ${(booking.totalCents / 100).toFixed(2)}
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
                  {booking.status === 'PENDING' && (
                    <Link 
                      href={`/bookings/${booking.id}`}
                      className="block w-full px-4 py-3 bg-emerald-600 text-white text-center text-sm font-semibold rounded-lg hover:bg-emerald-700 transition"
                    >
                      Complete Payment
                    </Link>
                  )}
                  
                  {booking.meetingUrl && (booking.status === 'PAID' || booking.status === 'CONFIRMED') && (
                    <a 
                      href={booking.meetingUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="block w-full px-4 py-3 bg-blue-600 text-white text-center text-sm font-semibold rounded-lg hover:bg-blue-700 transition"
                    >
                      Join Session
                    </a>
                  )}
                  
                  <Link 
                    href={`/reader/${booking.readerId}`} 
                    className="block text-center text-sm text-gray-600 hover:text-gray-900 py-2 transition"
                  >
                    View Reader Profile →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
