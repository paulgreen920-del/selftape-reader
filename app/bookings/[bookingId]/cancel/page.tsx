"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

interface Booking {
  id: string;
  startTime: string;
  durationMinutes: number;
  status: string;
  reader: {
    displayName: string | null;
    name: string;
  };
}

export default function CancelBookingPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.bookingId as string;

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [canceling, setCanceling] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function loadBooking() {
      try {
        const res = await fetch("/api/bookings/" + bookingId);
        if (!res.ok) throw new Error("Failed to load booking");
        const data = await res.json();
        setBooking(data.booking);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to load booking";
        setError(message);
      } finally {
        setLoading(false);
      }
    }
    loadBooking();
  }, [bookingId]);

  async function handleCancel() {
    if (!booking) return;
    setCanceling(true);
    setError("");

    try {
      const res = await fetch("/api/bookings/" + bookingId + "/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to cancel booking");
      setSuccess(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to cancel booking";
      setError(message);
    } finally {
      setCanceling(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <div className="text-5xl mb-4">✅</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Booking Canceled</h1>
          <p className="text-gray-600 mb-4">A refund will be processed if applicable.</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (error && !booking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="text-blue-600 hover:underline"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!booking) return null;

  const startTime = new Date(booking.startTime);

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <div className="text-center mb-6">
          <div className="text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900">Cancel Booking?</h1>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <p className="font-medium">{booking.reader.displayName || booking.reader.name}</p>
          <p className="text-sm text-gray-600">{startTime.toLocaleDateString()}</p>
          <p className="text-sm text-gray-600">{startTime.toLocaleTimeString()}</p>
          <p className="text-sm text-gray-600">{booking.durationMinutes} minutes</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6">{error}</div>
        )}

        <div className="flex gap-4">
          <button
            onClick={() => router.back()}
            className="flex-1 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Go Back
          </button>
          <button
            onClick={handleCancel}
            disabled={canceling}
            className="flex-1 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            {canceling ? "Canceling..." : "Cancel Booking"}
          </button>
        </div>
      </div>
    </div>
  );
}