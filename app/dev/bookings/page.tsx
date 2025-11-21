// Development booking management page
"use client";

import { useEffect, useState } from "react";

interface Booking {
  id: string;
  status: string;
  startTime: string;
  endTime: string;
  reader: {
    displayName?: string;
    name: string;
  };
  actor: {
    name: string;
    email: string;
  };
  meetingUrl?: string;
  notes?: string;
}

export default function BookingManagement() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const response = await fetch('/api/bookings?scope=all');
      const data = await response.json();
      if (data.ok) {
        setBookings(data.bookings || []);
      }
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const triggerWebhook = async (bookingId: string) => {
    setProcessing(bookingId);
    try {
      const response = await fetch('/api/dev/webhook-trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId })
      });
      
      const result = await response.json();
      
      if (result.ok) {
        alert('✅ Webhook triggered successfully! Calendar event should be created.');
        fetchBookings(); // Refresh the list
      } else {
        alert('❌ Webhook failed: ' + result.error);
      }
    } catch (error) {
      alert('❌ Error: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return <div className="p-8">Loading bookings...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Development: Booking Management</h1>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h2 className="font-semibold text-yellow-800 mb-2">⚠️ Development Tools</h2>
          <p className="text-yellow-700 text-sm">
            This page is for development testing only. Use the "Trigger Webhook" button to simulate 
            Stripe payment completion and create Google Calendar events for pending bookings.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h2 className="text-xl font-semibold">All Bookings</h2>
          <button
            onClick={fetchBookings}
            className="mt-2 text-sm text-blue-600 hover:text-blue-700"
          >
            ↻ Refresh
          </button>
        </div>

        {bookings.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No bookings found.
          </div>
        ) : (
          <div className="divide-y">
            {bookings.map((booking) => (
              <div key={booking.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        booking.status === 'CONFIRMED' 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {booking.status}
                      </span>
                      <span className="text-sm text-gray-500">
                        ID: {booking.id.substring(0, 8)}...
                      </span>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {booking.reader.displayName || booking.reader.name}
                        </h3>
                        <p className="text-sm text-gray-600">Reader</p>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {booking.actor.name}
                        </h3>
                        <p className="text-sm text-gray-600">{booking.actor.email}</p>
                      </div>
                    </div>

                    <div className="mt-4 grid md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Start:</span>{' '}
                        {new Date(booking.startTime).toLocaleString()}
                      </div>
                      <div>
                        <span className="font-medium">End:</span>{' '}
                        {new Date(booking.endTime).toLocaleString()}
                      </div>
                    </div>

                    {booking.meetingUrl && (
                      <div className="mt-2 text-sm">
                        <span className="font-medium">Meeting URL:</span>{' '}
                        <a
                          href={booking.meetingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-700"
                        >
                          {booking.meetingUrl}
                        </a>
                      </div>
                    )}

                    {booking.notes && (
                      <div className="mt-2 text-sm">
                        <span className="font-medium">Calendar Event:</span>{' '}
                        <span className="text-green-600">✅ Created</span>
                      </div>
                    )}
                  </div>

                  <div className="ml-4">
                    {booking.status === 'PENDING' ? (
                      <button
                        onClick={() => triggerWebhook(booking.id)}
                        disabled={processing === booking.id}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      >
                        {processing === booking.id ? 'Processing...' : 'Trigger Webhook'}
                      </button>
                    ) : (
                      <div className="text-sm text-green-600 font-medium">
                        ✅ Processed
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8 bg-gray-50 rounded-lg p-6">
        <h3 className="font-semibold mb-3">How to Test:</h3>
        <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
          <li>Create a booking through the normal booking flow</li>
          <li>The booking will be created with PENDING status</li>
          <li>Use the "Trigger Webhook" button to simulate payment completion</li>
          <li>This will change status to CONFIRMED and create Google Calendar event</li>
          <li>Check the reader's Google Calendar to see the event</li>
        </ol>
      </div>
    </div>
  );
}
