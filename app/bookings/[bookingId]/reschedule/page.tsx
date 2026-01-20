"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

interface Booking {
  id: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  status: string;
  reader: {
    id: string;
    displayName: string | null;
    name: string;
    timezone: string | null;
  };
  actor: {
    id: string;
    name: string;
    email: string;
  };
}

interface TimeSlot {
  startMin: number;
  endMin: number;
  startTime: string;
  endTime: string;
}

export default function RescheduleBookingPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.bookingId as string;

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Calendar state
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [rescheduling, setRescheduling] = useState(false);
  const [actorTimezone, setActorTimezone] = useState("America/New_York");

  // Load booking details
  useEffect(() => {
    async function loadBooking() {
      try {
        const res = await fetch("/api/bookings/" + bookingId);
        if (!res.ok) throw new Error("Failed to load booking");
        const data = await res.json();
        
        if (!data.ok) throw new Error(data.error || "Failed to load booking");
        
        // Check if booking can be rescheduled
        const bookingData = data.booking;
        if (bookingData.status !== "CONFIRMED") {
          throw new Error("Only confirmed bookings can be rescheduled");
        }
        
        const startTime = new Date(bookingData.startTime);
        const now = new Date();
        const hoursUntil = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60);
        
        if (hoursUntil < 2) {
          throw new Error("Bookings can only be rescheduled more than 2 hours before the session");
        }
        
        setBooking(bookingData);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to load booking";
        setError(message);
      } finally {
        setLoading(false);
      }
    }
    loadBooking();
    
    // Detect user's timezone
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setActorTimezone(tz);
  }, [bookingId]);

  // Load available slots when date is selected
  useEffect(() => {
    if (!selectedDate || !booking) return;

    // Capture values to avoid null checks in async function
    const currentDate = selectedDate;
    const currentBooking = booking;

    async function loadSlots() {
      setLoadingSlots(true);
      setSlots([]);
      setSelectedSlot(null);

      try {
        const dateStr = currentDate.toISOString().split("T")[0];
        const res = await fetch(
          `/api/schedule/available-slots?readerId=${currentBooking.reader.id}&date=${dateStr}&duration=${currentBooking.durationMinutes}&timezone=${encodeURIComponent(actorTimezone)}`
        );
        const data = await res.json();
        if (data.ok) {
          setSlots(data.slots || []);
        }
      } catch (err) {
        console.error("Failed to load slots:", err);
      } finally {
        setLoadingSlots(false);
      }
    }
    loadSlots();
  }, [selectedDate, booking, actorTimezone]);

  // Format time from minutes
  const formatTime = (min: number) => {
    const h = Math.floor(min / 60);
    const m = min % 60;
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    const ampm = h < 12 ? "AM" : "PM";
    return `${hour12}:${m.toString().padStart(2, "0")} ${ampm}`;
  };

  // Generate next 30 days for date picker
  const getAvailableDates = () => {
    const dates: Date[] = [];
    const today = new Date();
    for (let i = 1; i <= 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  // Handle reschedule
  async function handleReschedule() {
    if (!booking || !selectedSlot) return;
    setRescheduling(true);
    setError("");

    try {
      const res = await fetch(`/api/bookings/${bookingId}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newStartTime: selectedSlot.startTime,
          newEndTime: selectedSlot.endTime,
          timezone: actorTimezone,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reschedule booking");
      setSuccess(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to reschedule booking";
      setError(message);
    } finally {
      setRescheduling(false);
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
          <h1 className="text-xl font-bold text-gray-900 mb-2">Booking Rescheduled</h1>
          <p className="text-gray-600 mb-4">
            Your session has been moved to the new time. You&#39;ll receive a confirmation email shortly.
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

  if (error && !booking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Cannot Reschedule</h1>
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

  const currentStartTime = new Date(booking.startTime);
  const availableDates = getAvailableDates();

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="text-center mb-6">
            <div className="text-5xl mb-4">📅</div>
            <h1 className="text-2xl font-bold text-gray-900">Reschedule Booking</h1>
          </div>

          {/* Current Booking Info */}
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <h2 className="font-semibold text-gray-700 mb-2">Current Booking</h2>
            <p className="font-medium">{booking.reader.displayName || booking.reader.name}</p>
            <p className="text-sm text-gray-600">
              {currentStartTime.toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
                timeZone: actorTimezone,
              })}
            </p>
            <p className="text-sm text-gray-600">
              {currentStartTime.toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
                timeZone: actorTimezone,
              })}
            </p>
            <p className="text-sm text-gray-600">{booking.durationMinutes} minutes</p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6">{error}</div>
          )}

          {/* Date Selection */}
          <div className="mb-6">
            <h2 className="font-semibold text-gray-700 mb-3">Select New Date</h2>
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-7 gap-2">
              {availableDates.map((date) => {
                const isSelected = selectedDate?.toDateString() === date.toDateString();
                return (
                  <button
                    key={date.toISOString()}
                    onClick={() => setSelectedDate(date)}
                    className={`p-2 rounded-lg text-center text-sm transition-colors ${
                      isSelected
                        ? "bg-emerald-600 text-white"
                        : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                    }`}
                  >
                    <div className="font-medium">
                      {date.toLocaleDateString("en-US", { weekday: "short" })}
                    </div>
                    <div>
                      {date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time Slots */}
          {selectedDate && (
            <div className="mb-6">
              <h2 className="font-semibold text-gray-700 mb-3">
                Available Times for{" "}
                {selectedDate.toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </h2>

              {loadingSlots ? (
                <div className="text-center py-8 text-gray-500">Loading available times...</div>
              ) : slots.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No available times on this date. Please select another date.
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {slots.map((slot, idx) => {
                    const isSelected = selectedSlot?.startTime === slot.startTime;
                    return (
                      <button
                        key={idx}
                        onClick={() => setSelectedSlot(slot)}
                        className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                          isSelected
                            ? "bg-emerald-600 text-white"
                            : "bg-gray-100 hover:bg-emerald-100 text-gray-700"
                        }`}
                      >
                        {formatTime(slot.startMin)}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Selected New Time Summary */}
          {selectedSlot && (
            <div className="bg-emerald-50 p-4 rounded-lg mb-6 border border-emerald-200">
              <h2 className="font-semibold text-emerald-800 mb-2">New Time</h2>
              <p className="text-emerald-700">
                {selectedDate?.toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}{" "}
                at {formatTime(selectedSlot.startMin)}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={() => router.back()}
              className="flex-1 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleReschedule}
              disabled={!selectedSlot || rescheduling}
              className="flex-1 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {rescheduling ? "Rescheduling..." : "Confirm Reschedule"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}