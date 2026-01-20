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

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function RescheduleBookingPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.bookingId as string;

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [rescheduling, setRescheduling] = useState(false);
  const [actorTimezone, setActorTimezone] = useState("America/New_York");
  const [availableDays, setAvailableDays] = useState<string[]>([]);
  const [loadingAvailability, setLoadingAvailability] = useState(true);

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

  // Load available days when booking is loaded
  useEffect(() => {
    if (!booking) return;

    const currentBooking = booking;

    async function fetchAvailableDays() {
      setLoadingAvailability(true);
      try {
        const res = await fetch(
          `/api/schedule/available-days?readerId=${currentBooking.reader.id}&duration=${currentBooking.durationMinutes}`
        );
        const data = await res.json();
        if (data.ok) {
          setAvailableDays(data.availableDays || []);
        }
      } catch (err) {
        console.error("Failed to load available days:", err);
        setAvailableDays([]);
      } finally {
        setLoadingAvailability(false);
      }
    }
    fetchAvailableDays();
  }, [booking, currentMonth]);

  // Load available slots when date is selected
  useEffect(() => {
    if (!selectedDate || !booking) return;

    const currentDate = selectedDate;
    const currentBooking = booking;

    async function loadSlots() {
      setLoadingSlots(true);
      setSlots([]);
      setSelectedSlot(null);

      try {
        const res = await fetch(
          `/api/schedule/available-slots?readerId=${currentBooking.reader.id}&date=${currentDate}&duration=${currentBooking.durationMinutes}&timezone=${encodeURIComponent(actorTimezone)}`
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

  // Calendar helpers
  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: Array<Date | null> = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const days = getDaysInMonth();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + 30);

  const isDateAvailable = (date: Date | null) => {
    if (!date) return false;
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    
    if (compareDate < today || compareDate > maxDate) return false;
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    return availableDays.includes(dateStr);
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
    setSelectedDate(null);
    setSelectedSlot(null);
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
    setSelectedDate(null);
    setSelectedSlot(null);
  };

  const selectDate = (date: Date | null) => {
    if (!date || !isDateAvailable(date)) return;

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    setSelectedDate(dateStr);
    setSelectedSlot(null);
  };

  // Format time from minutes
  const formatTime = (min: number) => {
    const h = Math.floor(min / 60);
    const m = min % 60;
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    const ampm = h < 12 ? "AM" : "PM";
    return `${hour12}:${m.toString().padStart(2, "0")} ${ampm}`;
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

          {/* Calendar */}
          <div className="mb-6">
            <h2 className="font-semibold text-gray-700 mb-3">Select New Date</h2>
            
            {loadingAvailability ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="bg-gray-200 rounded-2xl px-6 py-4 shadow-sm">
                  <div className="flex space-x-2">
                    <div className="w-3 h-3 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1s' }}></div>
                    <div className="w-3 h-3 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '150ms', animationDuration: '1s' }}></div>
                    <div className="w-3 h-3 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '300ms', animationDuration: '1s' }}></div>
                  </div>
                </div>
                <div className="mt-4 text-center">
                  <p className="text-base text-gray-700 font-medium">Loading available dates...</p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <button
                    type="button"
                    className="flex items-center justify-center w-10 h-10 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    onClick={goToPreviousMonth}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <h3 className="text-lg font-semibold">
                    {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                  </h3>
                  <button
                    type="button"
                    className="flex items-center justify-center w-10 h-10 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    onClick={goToNextMonth}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-2">
                  {DAYS.map((day) => (
                    <div key={day} className="text-center text-sm font-medium text-gray-600 py-2">
                      {day}
                    </div>
                  ))}
                  {days.map((date, idx) => {
                    const available = isDateAvailable(date);
                    const year = date?.getFullYear();
                    const month = String((date?.getMonth() ?? 0) + 1).padStart(2, '0');
                    const day = String(date?.getDate() ?? 0).padStart(2, '0');
                    const dateStr = date ? `${year}-${month}-${day}` : '';
                    const isSelected = date && selectedDate === dateStr;

                    return (
                      <button
                        key={idx}
                        type="button"
                        className={`aspect-square rounded p-2 text-sm ${
                          !date
                            ? "invisible"
                            : isSelected
                            ? "bg-emerald-600 text-white font-semibold"
                            : available
                            ? "border-2 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 cursor-pointer font-medium"
                            : "bg-gray-50 text-gray-400 cursor-not-allowed border border-gray-200"
                        }`}
                        onClick={() => selectDate(date)}
                        disabled={!date || !available}
                      >
                        {date?.getDate()}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Time Slots */}
          {selectedDate && (
            <div className="mb-6">
              <h2 className="font-semibold text-gray-700 mb-3">
                Available Times for{" "}
                {(() => {
                  const [year, month, day] = selectedDate.split('-').map(Number);
                  const date = new Date(year, month - 1, day);
                  return date.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    month: 'long', 
                    day: 'numeric' 
                  });
                })()}
              </h2>

              {loadingSlots ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="bg-gray-200 rounded-2xl px-6 py-4 shadow-sm">
                    <div className="flex space-x-2">
                      <div className="w-3 h-3 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1s' }}></div>
                      <div className="w-3 h-3 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '150ms', animationDuration: '1s' }}></div>
                      <div className="w-3 h-3 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '300ms', animationDuration: '1s' }}></div>
                    </div>
                  </div>
                  <p className="mt-4 text-gray-600">Loading available times...</p>
                </div>
              ) : slots.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <p className="text-gray-600">No available times on this date.</p>
                  <p className="text-sm text-gray-500 mt-1">Please select another date.</p>
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
                            : "bg-gray-100 hover:bg-emerald-100 hover:border-emerald-300 text-gray-700 border border-gray-200"
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
                {(() => {
                  if (!selectedDate) return '';
                  const [year, month, day] = selectedDate.split('-').map(Number);
                  const date = new Date(year, month - 1, day);
                  return date.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    month: 'long', 
                    day: 'numeric',
                    year: 'numeric'
                  });
                })()}{" "}
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