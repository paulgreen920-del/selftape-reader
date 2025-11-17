"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type AvailabilitySlot = {
  id: string;
  dayOfWeek: number;
  startMin: number;
  endMin: number;
};

type Reader = {
  id: string;
  displayName: string;
  email: string;
  timezone: string;
  ratePer15Min: number;
  ratePer30Min: number;
  ratePer60Min: number;
};

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function BookingForm({
  reader,
  availability,
}: {
  reader: Reader;
  availability: AvailabilitySlot[];
}) {
  const router = useRouter();
  const [actorName, setActorName] = useState("");
  const [actorEmail, setActorEmail] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [duration, setDuration] = useState<15 | 30 | 60>(30);
  const [loading, setLoading] = useState(false);

  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split("T")[0];

  // Get available slots for selected date
  const slotsForDate = selectedDate
    ? availability.filter((slot) => {
        const date = new Date(selectedDate);
        return slot.dayOfWeek === date.getDay();
      })
    : [];

  function minutesToTime(min: number): string {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
  }

  function getPrice(): number {
    if (duration === 15) return reader.ratePer15Min;
    if (duration === 30) return reader.ratePer30Min;
    return reader.ratePer60Min;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!actorName || !actorEmail || !selectedDate || !selectedSlot) {
      alert("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      // Create booking and get Stripe Checkout URL
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          readerId: reader.id,
          actorName,
          actorEmail,
          date: selectedDate,
          startMin: parseInt(selectedSlot),
          durationMin: duration,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to create booking");
      }

      // Redirect to Stripe Checkout
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err: any) {
      alert(err.message || "Failed to book session");
      setLoading(false);
    }
  }

  return (
    <div className="border rounded-lg p-6 bg-white">
      <h2 className="text-xl font-semibold mb-4">Book a Session</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Your Name</label>
          <input
            type="text"
            className="border rounded px-3 py-2 w-full"
            value={actorName}
            onChange={(e) => setActorName(e.target.value)}
            placeholder="Jane Doe"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Your Email</label>
          <input
            type="email"
            className="border rounded px-3 py-2 w-full"
            value={actorEmail}
            onChange={(e) => setActorEmail(e.target.value)}
            placeholder="jane@example.com"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Session Duration</label>
          <select
            className="border rounded px-3 py-2 w-full"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value) as 15 | 30 | 60)}
          >
            <option value={15}>15 minutes (${(reader.ratePer15Min / 100).toFixed(0)})</option>
            <option value={30}>30 minutes (${(reader.ratePer30Min / 100).toFixed(0)})</option>
            <option value={60}>60 minutes (${(reader.ratePer60Min / 100).toFixed(0)})</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Date</label>
          <input
            type="date"
            className="border rounded px-3 py-2 w-full"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            min={today}
            required
          />
        </div>

        {selectedDate && slotsForDate.length > 0 && (
          <div>
            <label className="block text-sm font-medium mb-2">Time Slot</label>
            <select
              className="border rounded px-3 py-2 w-full"
              value={selectedSlot}
              onChange={(e) => setSelectedSlot(e.target.value)}
              required
            >
              <option value="">Select a time</option>
              {slotsForDate.map((slot) => (
                <option key={slot.id} value={slot.startMin}>
                  {minutesToTime(slot.startMin)} - {minutesToTime(slot.endMin)}
                </option>
              ))}
            </select>
          </div>
        )}

        {selectedDate && slotsForDate.length === 0 && (
          <p className="text-sm text-red-600">
            No availability on {DAYS[new Date(selectedDate).getDay()]}
          </p>
        )}

        <div className="pt-4 border-t">
          <div className="flex justify-between items-center mb-4">
            <span className="font-medium">Total:</span>
            <span className="text-2xl font-bold">${(getPrice() / 100).toFixed(0)}</span>
          </div>
          
          <button
            type="submit"
            className="w-full bg-emerald-600 text-white rounded px-4 py-3 hover:bg-emerald-700 disabled:opacity-50"
            disabled={loading || !selectedDate || !selectedSlot}
          >
            {loading ? "Processing..." : "Continue to Payment"}
          </button>
        </div>
      </form>
    </div>
  );
}