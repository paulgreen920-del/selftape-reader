"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type TimeSlot = {
  dayOfWeek: number;
  startMin: number;
  endMin: number;
};

type BookingSettings = {
  maxAdvanceBookingDays: number;
  minAdvanceHours: number;
  bookingBufferMin: number;
};

export default function AvailabilityForm() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Default M-F 9am-5pm
  const defaultSlots: TimeSlot[] = [
    { dayOfWeek: 1, startMin: 540, endMin: 1020 }, // Monday
    { dayOfWeek: 2, startMin: 540, endMin: 1020 }, // Tuesday
    { dayOfWeek: 3, startMin: 540, endMin: 1020 }, // Wednesday
    { dayOfWeek: 4, startMin: 540, endMin: 1020 }, // Thursday
    { dayOfWeek: 5, startMin: 540, endMin: 1020 }, // Friday
  ];

  const [slots, setSlots] = useState<TimeSlot[]>(defaultSlots);
  const [settings, setSettings] = useState<BookingSettings>({
    maxAdvanceBookingDays: 15,
    minAdvanceHours: 2,
    bookingBufferMin: 15,
  });
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch current user if no userId in URL
  useEffect(() => {
    async function init() {
      // Check URL params first
      const urlUserId = searchParams.get("userId") || searchParams.get("readerId");
      
      if (urlUserId) {
        setUserId(urlUserId);
        setLoading(false);
        return;
      }

      // No URL param - fetch from current session
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) {
          router.push("/login");
          return;
        }
        
        const data = await res.json();
        if (!data.ok || !data.user) {
          router.push("/login");
          return;
        }

        setUserId(data.user.id);
      } catch (err) {
        console.error("Failed to fetch user:", err);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [searchParams, router]);

  function addSlot() {
    setSlots([...slots, { dayOfWeek: 1, startMin: 540, endMin: 1020 }]);
  }

  function duplicateSlot(index: number) {
    const slotToDuplicate = slots[index];
    setSlots([...slots, { ...slotToDuplicate }]);
  }

  function removeSlot(index: number) {
    setSlots(slots.filter((_, i) => i !== index));
  }

  function updateSlot(index: number, field: keyof TimeSlot, value: number) {
    setSlots(slots.map((slot, i) => (i === index ? { ...slot, [field]: value } : slot)));
  }

  function minutesToTime(min: number): string {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
  }

  function timeToMinutes(time: string): number {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
  }

  async function saveAvailability() {
    if (!userId) {
      alert("User not loaded. Please refresh the page.");
      return;
    }

    setSaving(true);
    try {
      // Save availability slots
      const resSlots = await fetch("/api/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, slots }),
      });

      const dataSlots = await resSlots.json();
      if (!resSlots.ok || !dataSlots.ok) {
        throw new Error(dataSlots.error || "Failed to save availability");
      }

      // Save booking settings
      const resSettings = await fetch("/api/readers/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          maxAdvanceBooking: settings.maxAdvanceBookingDays * 24, // convert days to hours
          minAdvanceHours: settings.minAdvanceHours,
          bookingBuffer: settings.bookingBufferMin,
        }),
      });

      const dataSettings = await resSettings.json();
      if (!resSettings.ok || !dataSettings.ok) {
        throw new Error(dataSettings.error || "Failed to save settings");
      }

      // Sync availability to generate actual bookable slots
      const resSync = await fetch("/api/availability/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const dataSync = await resSync.json();
      if (!resSync.ok || !dataSync.ok) {
        console.error("Failed to sync availability slots:", dataSync.error);
        // Don't block onboarding, just log the error
      }

      router.push('/onboarding/payment');
    } catch (err: any) {
      alert(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <p>Loading...</p>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <p>Unable to load user. Please <a href="/login" className="text-emerald-600 underline">log in</a> and try again.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Set Your Availability</h1>
      <p className="text-sm text-gray-600 mb-6">
        Choose when actors can book sessions with you.
      </p>

      {/* Booking Settings */}
      <div className="bg-white border rounded-lg p-6 mb-6">
        <h2 className="font-semibold mb-4">Booking Settings</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Max Advance Booking
              <span className="text-gray-500 font-normal ml-1">(days)</span>
            </label>
            <select
              className="border rounded px-3 py-2 w-full bg-white"
              value={settings.maxAdvanceBookingDays}
              onChange={(e) =>
                setSettings({ ...settings, maxAdvanceBookingDays: parseInt(e.target.value) })
              }
            >
              {Array.from({ length: 16 }, (_, i) => i).map((days) => (
                <option key={days} value={days}>
                  {days === 0 ? "Same day only" : `${days} day${days !== 1 ? 's' : ''}`}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">How far ahead can actors book?</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Min Advance Notice
              <span className="text-gray-500 font-normal ml-1">(hours)</span>
            </label>
            <select
              className="border rounded px-3 py-2 w-full bg-white"
              value={settings.minAdvanceHours}
              onChange={(e) =>
                setSettings({ ...settings, minAdvanceHours: parseInt(e.target.value) })
              }
            >
              <option value="0">No minimum</option>
              <option value="1">1 hour</option>
              <option value="2">2 hours</option>
              <option value="3">3 hours</option>
              <option value="4">4 hours</option>
              <option value="6">6 hours</option>
              <option value="8">8 hours</option>
              <option value="12">12 hours</option>
              <option value="24">1 day</option>
              <option value="48">2 days</option>
              <option value="72">3 days</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">Minimum notice required</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Buffer Time
              <span className="text-gray-500 font-normal ml-1">(minutes)</span>
            </label>
            <select
              className="border rounded px-3 py-2 w-full bg-white"
              value={settings.bookingBufferMin}
              onChange={(e) =>
                setSettings({ ...settings, bookingBufferMin: parseInt(e.target.value) })
              }
            >
              <option value="0">No buffer</option>
              <option value="5">5 minutes</option>
              <option value="10">10 minutes</option>
              <option value="15">15 minutes</option>
              <option value="20">20 minutes</option>
              <option value="30">30 minutes</option>
              <option value="45">45 minutes</option>
              <option value="60">1 hour</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">Break between sessions</p>
          </div>
        </div>
      </div>

      {/* Weekly Schedule */}
      <div className="bg-white border rounded-lg p-6 mb-6">
        <h2 className="font-semibold mb-4">Weekly Schedule</h2>
        <div className="space-y-4">
          {slots.map((slot, i) => (
            <div key={i} className="border rounded-lg p-4 bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Day</label>
                  <select
                    className="border rounded px-3 py-2 w-full bg-white"
                    value={slot.dayOfWeek}
                    onChange={(e) => updateSlot(i, "dayOfWeek", Number(e.target.value))}
                  >
                    {DAYS.map((day, idx) => (
                      <option key={idx} value={idx}>
                        {day}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Start Time</label>
                  <input
                    type="time"
                    className="border rounded px-3 py-2 w-full"
                    value={minutesToTime(slot.startMin)}
                    onChange={(e) => updateSlot(i, "startMin", timeToMinutes(e.target.value))}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">End Time</label>
                  <input
                    type="time"
                    className="border rounded px-3 py-2 w-full"
                    value={minutesToTime(slot.endMin)}
                    onChange={(e) => updateSlot(i, "endMin", timeToMinutes(e.target.value))}
                  />
                </div>

                <div className="flex items-end gap-2">
                  <button
                    type="button"
                    className="border border-gray-300 rounded px-3 py-2 text-sm bg-white hover:bg-gray-50 transition"
                    onClick={() => duplicateSlot(i)}
                    title="Duplicate this time slot"
                  >
                    Duplicate
                  </button>
                  <button
                    type="button"
                    className="border border-red-300 rounded px-3 py-2 text-sm text-red-600 bg-white hover:bg-red-50 transition"
                    onClick={() => removeSlot(i)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          className="mt-4 border rounded px-4 py-2 hover:bg-gray-50"
          onClick={addSlot}
        >
          + Add Time Slot
        </button>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          className="border rounded px-4 py-2"
          onClick={() => router.push('/onboarding/schedule')}
        >
          Back
        </button>
        <button
          type="button"
          onClick={() => router.push('/dashboard')}
          className="border border-gray-300 rounded px-4 py-2 text-gray-700 hover:bg-gray-50"
        >
          Skip for now
        </button>
        <button
          type="button"
          className="bg-emerald-600 text-white rounded px-4 py-2 hover:bg-emerald-700 disabled:opacity-50 flex-1"
          onClick={saveAvailability}
          disabled={saving || slots.length === 0 || !userId}
        >
          {saving ? "Saving..." : "Save & Continue"}
        </button>
      </div>
    </div>
  );
}