'use client';
import { useEffect, useState } from 'react';

type Booking = {
  id: string;
  actorName: string;
  actorEmail: string;
  startTime: string;
  endTime: string;
  status: string;
  totalCents: number;
  durationMinutes: number;
};

function getStatusColor(status: string) {
  switch (status.toUpperCase()) {
    case 'CONFIRMED': return 'bg-emerald-100 text-emerald-800';
    case 'PENDING': return 'bg-yellow-100 text-yellow-800';
    case 'COMPLETED': return 'bg-blue-100 text-blue-800';
    case 'CANCELED': return 'bg-gray-100 text-gray-800';
    case 'NO_SHOW': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}

function formatCents(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(cents / 100);
}

export default function BookingsList({ readerId }: { readerId: string }) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/bookings?readerId=${readerId}&scope=all`);
        const json = await res.json();
        
        if (!res.ok) {
          throw new Error(json.error || 'Failed to fetch bookings');
        }
        
        if (json?.ok) {
          setBookings(json.bookings || []);
        } else {
          setError('Failed to load bookings');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load bookings');
      } finally {
        setLoading(false);
      }
    };
    
    fetchBookings();
  }, [readerId]);

  return (
    <div className="bg-white rounded-2xl border shadow-sm p-6">
      <h3 className="text-xl font-semibold mb-4">Recent Bookings</h3>
      
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {!loading && !error && bookings.length === 0 && (
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-gray-600 font-medium">No bookings yet</p>
          <p className="text-sm text-gray-500 mt-1">Bookings will appear here once actors start booking sessions</p>
        </div>
      )}

      {!loading && !error && bookings.length > 0 && (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {bookings.map((booking) => (
            <div key={booking.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="font-medium text-gray-900">{booking.actorName}</h4>
                  <p className="text-sm text-gray-600">{booking.actorEmail}</p>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                  {booking.status}
                </span>
              </div>
              
              <div className="text-sm text-gray-700 space-y-1">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>{new Date(booking.startTime).toLocaleDateString()}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>
                    {new Date(booking.startTime).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })} - {new Date(booking.endTime).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                  <span className="text-gray-500">({booking.durationMinutes} min)</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                  <span className="font-medium">{formatCents(booking.totalCents || 0)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
