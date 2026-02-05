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

type SortOption = 'soonest' | 'furthest';

export default function ReaderBookingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming');
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('soonest');

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
        if (userData.user.role !== 'READER' && userData.user.isAdmin !== true) {
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

  async function deletePendingBooking(bookingId: string) {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;

    const confirmed = window.confirm(
      `Delete this pending booking with ${booking.actorName}?\n\nThis will remove the booking without affecting your cancellation record.`
    );

    if (!confirmed) return;

    setDeleteLoading(bookingId);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Failed to delete booking');
      }

      // Remove the booking from the list
      setBookings(prev => prev.filter(b => b.id !== bookingId));

      alert('Booking deleted successfully.');
    } catch (err: any) {
      console.error('Delete error:', err);
      alert(err.message || 'Failed to delete booking. Please try again.');
    } finally {
      setDeleteLoading(null);
    }
  }

  const now = new Date();
  
  // Filter by tab (upcoming/past/all)
  let filteredBookings = bookings.filter(b => {
    const start = new Date(b.startTime);
    if (filter === 'upcoming') return start >= now;
    if (filter === 'past') return start < now;
    return true;
  });

  // Filter by search term
  if (searchTerm.trim()) {
    const term = searchTerm.toLowerCase();
    filteredBookings = filteredBookings.filter(b =>
      b.actorName.toLowerCase().includes(term) ||
      b.actorEmail.toLowerCase().includes(term)
    );
  }

  // Sort
  filteredBookings.sort((a, b) => {
    const dateA = new Date(a.startTime).getTime();
    const dateB = new Date(b.startTime).getTime();
    return sortBy === 'soonest' ? dateA - dateB : dateB - dateA;
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

          {/* Search and Sort Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3 p-4">
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
                placeholder="Search by actor name or email..."
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
        </div>

        {/* Bookings List */}
        {filteredBookings.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600 mb-4">
              {searchTerm
                ? `No bookings found matching "${searchTerm}"`
                : filter === 'upcoming' 
                  ? "You don't have any upcoming sessions."
                  : filter === 'past'
                    ? "You don't have any past sessions yet."
                    : "You haven't received any bookings yet."
              }
            </p>
            {!searchTerm && (
              <Link href="/reader/availability" className="inline-block bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 transition">
                Manage Availability
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBookings.map(booking => {
              const start = new Date(booking.startTime);
              const end = new Date(booking.endTime);
              const isPast = start < now;
              const earnings = booking.status === 'PAID' ? (booking.priceCents * 0.8) / 100 : 0;

              return (
                <div key={booking.id} className="bg-white border rounded-lg p-4 sm:p-6 hover:shadow-md transition">
                  {/* Status Badge Row */}
                  <div className="flex items-center justify-between mb-3">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                      booking.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' :
                      booking.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                      booking.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {booking.status}
                    </span>
                    {isPast && (
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                        Completed
                      </span>
                    )}
                  </div>

                  {/* Title, Duration, Price, Earnings */}
                  <div className="mb-3">
                    <h3 className="text-lg sm:text-xl font-semibold mb-2">Session with {booking.actorName}</h3>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 mb-2">
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
                        ${(booking.priceCents / 100).toFixed(2)}
                      </span>
                      {earnings > 0 && (
                        <span className={`flex items-center gap-1 font-semibold ${isPast ? 'text-green-600' : 'text-blue-600'}`}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          {isPast ? 'Earned:' : 'Will earn:'} ${earnings.toFixed(2)}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      <span className="inline-flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        {booking.actorEmail}
                      </span>
                    </p>
                  </div>

                  {/* Date & Time */}
                  <div className="mb-4 pb-4 border-b">
                    <div className="flex items-start gap-2 text-sm">
                      <svg className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <div>
                        <div className="font-medium text-gray-900">
                          {start.toLocaleDateString('en-US', { 
                            weekday: 'short', 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric' 
                          })}
                        </div>
                        <div className="text-gray-600">
                          {start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - 
                          {end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Status Info */}
                  {booking.status === 'PAID' && !isPast && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                      <p className="text-sm text-blue-700">
                        💡 <strong>Tip:</strong> Test your camera and microphone before the session. 
                        The actor is counting on you for professional feedback!
                      </p>
                    </div>
                  )}

                  {booking.status === 'PENDING' && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                      <p className="text-sm text-yellow-700 mb-3">
                        ⏳ <strong>Awaiting Payment:</strong> The actor hasn't completed payment yet. You'll be notified once confirmed.
                      </p>
                      <button
                        onClick={() => deletePendingBooking(booking.id)}
                        disabled={deleteLoading === booking.id}
                        className="w-full px-4 py-2 bg-gray-100 text-gray-700 text-center text-sm font-medium rounded-lg hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {deleteLoading === booking.id ? 'Deleting...' : 'Delete Booking'}
                      </button>
                    </div>
                  )}

                  {booking.status === 'CANCELLED' && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                      <p className="text-sm text-red-700">
                        ✗ <strong>Cancelled:</strong> This booking has been cancelled.
                      </p>
                    </div>
                  )}

                  {/* Action Button */}
                  {booking.meetingUrl && (booking.status === 'PAID' || booking.status === 'CONFIRMED') && !isPast && (
                    <a 
                      href={booking.meetingUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="block w-full px-4 py-3 bg-blue-600 text-white text-center text-sm font-semibold rounded-lg hover:bg-blue-700 transition"
                    >
                      Join Session
                    </a>
                  )}

                  {isPast && (
                    <div className="text-center py-2 text-sm text-gray-500">
                      Session ended
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