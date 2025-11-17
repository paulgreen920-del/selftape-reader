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
    displayName: string;
    email: string;
  };
  actor: {
    name: string;
    email: string;
  };
}

export default function CancelBookingPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.bookingId as string;

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [canceling, setCanceling] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [refundInfo, setRefundInfo] = useState<any>(null);

  useEffect(() => {
    async function loadBooking() {
      try {
        // TODO: Create GET /api/bookings/[id] endpoint
        const res = await fetch(`/api/bookings/${bookingId}`);
        if (!res.ok) throw new Error("Failed to load booking");
        const data = await res.json();
        setBooking(data.booking);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadBooking();
  }, [bookingId]);

  async function handleCancel() {
    if (!booking) return;

    if (!confirm("Are you sure you want to cancel this booking? This action cannot be undone.")) {
      return;
    }

    setCanceling(true);
    setError("");

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
