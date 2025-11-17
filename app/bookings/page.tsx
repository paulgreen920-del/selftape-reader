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
              <div key={booking.id} className="bg-white border rounded-lg p-6 hover:shadow-md transition">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold mb-1">Session with {booking.readerName}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        booking.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' :
                        booking.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>{booking.status}</span>
                      <span>•</span>
                      <span>{booking.durationMinutes} min</span>
                      <span>•</span>
                      <span>${(booking.totalCents / 100).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <div className="text-xs text-gray-500 uppercase mb-1">Date & Time</div>
                    <div className="font-medium">{start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</div>
                    <div className="text-sm text-gray-600">{start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - {end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</div>
                  </div>

                  {booking.meetingUrl && (
                    <div>
                      <div className="text-xs text-gray-500 uppercase mb-1">Meeting Link</div>
                      <a href={booking.meetingUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 font-medium text-sm underline">Join Session</a>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <Link href={`/reader/${booking.readerId}`} className="text-sm text-gray-600 hover:text-gray-900">View Reader Profile →</Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}