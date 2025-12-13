"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function AdminAvailabilityPage() {
  // Initial state for reader selection, date, and data
  const [readerId, setReaderId] = useState("");
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [readerInfo, setReaderInfo] = useState<any>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [readers, setReaders] = useState<any[]>([]);

  // Fetch readers for dropdown
  useEffect(() => {
    fetch("/api/admin/users?role=READER")
      .then((res) => res.json())
      .then((data) => setReaders(data.users || []));
  }, []);

  // Load all debug data
  const loadAvailability = async () => {
    if (!readerId || !date) return;
    setLoading(true);
    try {
      // Reader info
      const infoRes = await fetch(`/api/admin/users?id=${readerId}`);
      const infoData = await infoRes.json();
      setReaderInfo(infoData.user);
      // Templates
      const templatesRes = await fetch(`/api/admin/availability?readerId=${readerId}&type=templates`);
      setTemplates((await templatesRes.json()).templates || []);
      // Slots
      const slotsRes = await fetch(`/api/admin/availability?readerId=${readerId}&date=${date}&type=slots`);
      setSlots((await slotsRes.json()).slots || []);
      // Bookings
      const bookingsRes = await fetch(`/api/admin/bookings?readerId=${readerId}&date=${date}`);
      setBookings((await bookingsRes.json()).bookings || []);
      // Calendar events
      const calRes = await fetch(`/api/admin/availability?readerId=${readerId}&date=${date}&type=calendar`);
      setCalendarEvents((await calRes.json()).events || []);
    } catch (err) {
      alert("Failed to load availability data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Availability Debug</h1>
      <div className="flex gap-4 mb-6">
        <select
          className="border rounded px-3 py-2"
          value={readerId}
          onChange={(e) => setReaderId(e.target.value)}
        >
          <option value="">Select Reader</option>
          {readers.map((r: any) => (
            <option key={r.id} value={r.id}>{r.name} ({r.email})</option>
          ))}
        </select>
        <input
          type="date"
          className="border rounded px-3 py-2"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded"
          onClick={loadAvailability}
          disabled={!readerId || !date || loading}
        >
          {loading ? "Loading..." : "Load Availability"}
        </button>
      </div>

      {/* Reader Info Card */}
      {readerInfo && (
        <div className="bg-white rounded shadow p-4 mb-6">
          <h2 className="text-lg font-semibold mb-2">Reader Info</h2>
          <p><b>Name:</b> {readerInfo.name}</p>
          <p><b>Email:</b> {readerInfo.email}</p>
          <p><b>Timezone:</b> {readerInfo.timezone}</p>
          <p><b>Calendar:</b> {readerInfo.calendarProvider || "None"}</p>
          <p><b>Subscription:</b> {readerInfo.subscriptionStatus || "Unknown"}</p>
        </div>
      )}

      {/* Availability Templates Table */}
      {templates.length > 0 && (
        <div className="bg-white rounded shadow p-4 mb-6">
          <h2 className="text-lg font-semibold mb-2">Availability Templates</h2>
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th>Day</th>
                <th>Start</th>
                <th>End</th>
                <th>Active</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((t: any) => (
                <tr key={t.id}>
                  <td>{t.dayOfWeek}</td>
                  <td>{t.startTime}</td>
                  <td>{t.endTime}</td>
                  <td>{t.isActive ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Availability Slots Table */}
      {slots.length > 0 && (
        <div className="bg-white rounded shadow p-4 mb-6">
          <h2 className="text-lg font-semibold mb-2">Availability Slots</h2>
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th>Start (UTC)</th>
                <th>End (UTC)</th>
                <th>Start (Local)</th>
                <th>End (Local)</th>
                <th>Booked</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {slots.map((s: any) => (
                <tr key={s.id}>
                  <td>{s.startTime}</td>
                  <td>{s.endTime}</td>
                  <td>{s.startTimeLocal}</td>
                  <td>{s.endTimeLocal}</td>
                  <td>{s.isBooked ? "Yes" : "No"}</td>
                  <td>
                    <span className={
                      s.status === "available" ? "text-green-600" :
                      s.status === "booked" ? "text-red-600" :
                      s.status === "blocked" ? "text-yellow-600" : ""
                    }>
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Bookings Table */}
      {bookings.length > 0 && (
        <div className="bg-white rounded shadow p-4 mb-6">
          <h2 className="text-lg font-semibold mb-2">Bookings</h2>
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th>Actor</th>
                <th>Start</th>
                <th>End</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b: any) => (
                <tr key={b.id}>
                  <td>{b.actorName}</td>
                  <td>{b.startTime}</td>
                  <td>{b.endTime}</td>
                  <td>{b.status}</td>
                  <td>{b.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Calendar Events Table */}
      {calendarEvents.length > 0 && (
        <div className="bg-white rounded shadow p-4 mb-6">
          <h2 className="text-lg font-semibold mb-2">Calendar Events</h2>
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th>Summary</th>
                <th>Start</th>
                <th>End</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {calendarEvents.map((e: any, idx: number) => (
                <tr key={idx}>
                  <td>{e.summary}</td>
                  <td>{e.start}</td>
                  <td>{e.end}</td>
                  <td>{e.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
