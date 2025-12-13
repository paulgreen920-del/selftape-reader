"use client";

import { useState } from "react";
import Link from "next/link";

export default function AdminToolsPage() {
  // State for quick actions
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [expireLoading, setExpireLoading] = useState(false);
  const [showExpireModal, setShowExpireModal] = useState(false);
  const [syncReaderId, setSyncReaderId] = useState("");
  const [syncResult, setSyncResult] = useState<string>("");
  const [statusBookingId, setStatusBookingId] = useState("");
  const [statusNew, setStatusNew] = useState("PENDING");
  const [statusResult, setStatusResult] = useState("");
  const [exportFrom, setExportFrom] = useState("");
  const [exportTo, setExportTo] = useState("");
  const [exportResult, setExportResult] = useState("");

  // Get pending bookings count
  const fetchPendingCount = async () => {
    const res = await fetch("/api/admin/tools/expire-pending", { method: "GET" });
    const data = await res.json();
    setPendingCount(data.count || 0);
  };

  // Expire old pending bookings
  const expirePending = async () => {
    setExpireLoading(true);
    try {
      const res = await fetch("/api/admin/tools/expire-pending", { method: "POST" });
      const data = await res.json();
      setPendingCount(data.count || 0);
      setShowExpireModal(false);
      alert(`Expired ${data.count} bookings.`);
    } catch {
      alert("Failed to expire bookings");
    } finally {
      setExpireLoading(false);
    }
  };

  // Force sync availability
  const syncAvailability = async () => {
    if (!syncReaderId) return;
    setSyncResult("");
    const res = await fetch("/api/admin/tools/sync-availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ readerId: syncReaderId }),
    });
    const data = await res.json();
    setSyncResult(data.message || "");
  };

  // Manual booking status update
  const updateStatus = async () => {
    if (!statusBookingId) return;
    setStatusResult("");
    const res = await fetch("/api/admin/bookings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId: statusBookingId, status: statusNew }),
    });
    const data = await res.json();
    setStatusResult(data.ok ? "Updated!" : data.error || "Failed");
  };

  // Export users/bookings
  const exportUsers = async (readersOnly = false) => {
    const url = `/api/admin/export?type=users&format=csv${readersOnly ? "&role=READER" : ""}`;
    window.location.href = url;
  };
  const exportBookings = async () => {
    if (!exportFrom || !exportTo) return;
    const url = `/api/admin/export?type=bookings&from=${exportFrom}&to=${exportTo}&format=csv`;
    window.location.href = url;
  };

  return (
    <div className="max-w-4xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Admin Tools</h1>
      {/* Quick Actions */}
      <div className="bg-white rounded shadow p-4 mb-6">
        <h2 className="text-lg font-semibold mb-2">Quick Actions</h2>
        {/* Expire Pending Bookings */}
        <div className="mb-4">
          <button
            className="bg-red-600 text-white px-4 py-2 rounded"
            onClick={() => { setShowExpireModal(true); fetchPendingCount(); }}
          >
            Expire Old Pending Bookings
          </button>
          {showExpireModal && (
            <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded shadow-lg">
                <h3 className="text-lg font-bold mb-2">Confirm Expire</h3>
                <p>Expire all pending bookings older than 15 minutes?</p>
                <p className="mt-2">Count: {pendingCount ?? "..."}</p>
                <div className="flex gap-4 mt-4">
                  <button className="px-4 py-2 bg-gray-300 rounded" onClick={() => setShowExpireModal(false)}>Cancel</button>
                  <button className="px-4 py-2 bg-red-600 text-white rounded" onClick={expirePending} disabled={expireLoading}>
                    {expireLoading ? "Expiring..." : "Expire"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        {/* Force Sync Availability */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Reader ID"
            className="border rounded px-3 py-2 mr-2"
            value={syncReaderId}
            onChange={e => setSyncReaderId(e.target.value)}
          />
          <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={syncAvailability}>
            Regenerate Availability Slots
          </button>
          {syncResult && <span className="ml-2 text-green-600">{syncResult}</span>}
        </div>
        {/* Manual Booking Status Update */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Booking ID"
            className="border rounded px-3 py-2 mr-2"
            value={statusBookingId}
            onChange={e => setStatusBookingId(e.target.value)}
          />
          <select
            className="border rounded px-3 py-2 mr-2"
            value={statusNew}
            onChange={e => setStatusNew(e.target.value)}
          >
            <option value="PENDING">PENDING</option>
            <option value="CONFIRMED">CONFIRMED</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="CANCELED">CANCELED</option>
          </select>
          <button className="bg-green-600 text-white px-4 py-2 rounded" onClick={updateStatus}>
            Update Status
          </button>
          {statusResult && <span className="ml-2 text-green-600">{statusResult}</span>}
        </div>
      </div>
      {/* Export Section */}
      <div className="bg-white rounded shadow p-4 mb-6">
        <h2 className="text-lg font-semibold mb-2">Export</h2>
        <div className="mb-4 flex gap-4">
          <button className="bg-gray-700 text-white px-4 py-2 rounded" onClick={() => exportUsers(false)}>
            Export All Users (CSV)
          </button>
          <button className="bg-gray-700 text-white px-4 py-2 rounded" onClick={() => exportUsers(true)}>
            Export Readers Only (CSV)
          </button>
        </div>
        <div className="mb-4 flex gap-4 items-center">
          <input
            type="date"
            className="border rounded px-3 py-2"
            value={exportFrom}
            onChange={e => setExportFrom(e.target.value)}
          />
          <span>to</span>
          <input
            type="date"
            className="border rounded px-3 py-2"
            value={exportTo}
            onChange={e => setExportTo(e.target.value)}
          />
          <button className="bg-gray-700 text-white px-4 py-2 rounded" onClick={exportBookings}>
            Export Bookings (CSV)
          </button>
        </div>
        {exportResult && <div className="text-green-600 mt-2">{exportResult}</div>}
      </div>
    </div>
  );
}
