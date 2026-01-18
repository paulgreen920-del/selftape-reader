"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

interface Booking {
  id: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  status: string;
  totalCents: number;
  reader: {
    id: string;
    displayName: string | null;
    name: string;
  };
  actor: {
    id: string;
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

      if (!res.ok) {
        throw new Error(data.error || "Failed to cancel booking");
      }

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
        <div className="text-gray-600">Loading booking...</div>
      </div>
    );
  }

  if (error && !booking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
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

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <div className="text-green-500 text-5xl mb-4">✅</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Booking Canceled</h1>
          <p className="text-gray-600 mb-4">
            The booking has been canceled. A refund will be processed if applicable.
          </p>
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

  if (!booking) return null;

  const startTime = new Date(booking.startTime);
  const formattedDate = startTime.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const formattedTime = startTime.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="text-center mb-6">
            <div className="text-red-500 text-5xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-900">Cancel Booking?</h1>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <p className="text-sm text-gray-600 mb-2">Session with:</p>
            <p className="font-medium text-gray-900">
              {booking.reader.displayName || booking.reader.name}
            </p>
            <p className="text-sm text-gray-600 mt-2">{formattedDate}</p>
            <p className="text-sm text-gray-600">{formattedTime}</p>
            <p className="text-sm text-gray-600">{booking.durationMinutes} minutes</p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-6">
            <p className="text-sm text-yellow-800">
              <strong>Refund Policy:</strong> Cancellations made 2+ hours before the session receive a full refund minus processing fees. Cancellations under 2 hours may not be eligible for a refund.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6">
              {error}
            </div>
          )}

          <div className="flex gap-4">
            <button
              onClick={() => router.back()}
              className="flex-1 py-3 px-6 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
            >
              Go Back
            </button>
            <button
              onClick={handleCancel}
              disabled={canceling}
              className="flex-1 py-3 px-6 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {canceling ? "Canceling..." : "Cancel Booking"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

    try {
      const res = await fetch("/api/bookings/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          canceledBy: "ACTOR", // TODO: Determine from session
          reason,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to cancel booking");
      }

      setRefundInfo(data.refund);
      
      // Show success and redirect after delay
      setTimeout(() => {
        router.push("/bookings");
      }, 5000);
    } catch (err: any) {
      setError(err.message);
      setCanceling(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <p>Loading booking details...</p>
      </div>
    );
  }

  if (error && !booking) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <p>Booking not found</p>
      </div>
    );
  }

  if (refundInfo) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h1 className="text-2xl font-bold text-green-900 mb-4">✓ Booking Canceled</h1>
          <p className="text-green-800 mb-4">{refundInfo.message}</p>
          
          <div className="bg-white rounded-lg p-4 mb-4">
            <h2 className="font-semibold mb-2">Refund Details</h2>
            <ul className="space-y-2 text-sm">
              <li>
                <strong>Refund Amount:</strong> ${(refundInfo.amount / 100).toFixed(2)}
              </li>
              {refundInfo.processingFee > 0 && (
                <li>
                  <strong>Processing Fee:</strong> -${(refundInfo.processingFee / 100).toFixed(2)}
                </li>
              )}
              {refundInfo.platformCredit > 0 && (
                <li className="text-green-700">
                  <strong>Platform Credit:</strong> +${(refundInfo.platformCredit / 100).toFixed(2)}
                </li>
              )}
            </ul>
          </div>

          <p className="text-sm text-gray-600">
            Refunds typically process within 5-10 business days. Redirecting to bookings page...
          </p>
        </div>
      </div>
    );
  }

  const startTime = new Date(booking.startTime);
  const now = new Date();
  const hoursUntil = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60);

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Cancel Booking</h1>

      <div className="bg-white border rounded-lg p-6 mb-6">
        <h2 className="font-semibold mb-4">Session Details</h2>
        <dl className="space-y-2 text-sm">
          <div>
            <dt className="font-medium text-gray-600">Reader:</dt>
            <dd>{booking.reader.displayName}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-600">Date & Time:</dt>
            <dd>{startTime.toLocaleString()}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-600">Duration:</dt>
            <dd>{booking.durationMinutes} minutes</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-600">Amount Paid:</dt>
            <dd>${(booking.totalCents / 100).toFixed(2)}</dd>
          </div>
        </dl>
      </div>

      {/* Cancellation Policy Warning */}
      <div className={`border-l-4 rounded-lg p-4 mb-6 ${
        hoursUntil >= 2 
          ? "bg-blue-50 border-blue-500" 
          : "bg-red-50 border-red-500"
      }`}>
        <h3 className="font-semibold mb-2">
          {hoursUntil >= 2 ? "✓ Full Refund Eligible" : "⚠️ No Refund"}
        </h3>
        <p className="text-sm mb-2">
          {hoursUntil >= 2 ? (
            <>
              You're canceling with <strong>{Math.floor(hoursUntil)} hours</strong> notice. 
              You'll receive a full refund minus a small processing fee (~$2).
            </>
          ) : (
            <>
              You're canceling with less than 2 hours notice. No refund will be issued, 
              and the reader will receive full payment as they have reserved this time.
            </>
          )}
        </p>
        <p className="text-xs text-gray-600">
          See our <a href="/terms" className="underline">cancellation policy</a> for full details.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">
          Reason for Cancellation (Optional)
        </label>
        <textarea
          className="w-full border rounded-lg px-3 py-2"
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Help us improve by sharing why you're canceling..."
        />
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleCancel}
          disabled={canceling}
          className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50"
        >
          {canceling ? "Canceling..." : "Confirm Cancellation"}
        </button>
        <button
          onClick={() => router.back()}
          disabled={canceling}
          className="border px-6 py-2 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          Keep Booking
        </button>
      </div>
    </div>
  );
}
