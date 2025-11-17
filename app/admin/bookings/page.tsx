'use client';

import { useEffect, useState } from 'react';

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);
  const [editingBooking, setEditingBooking] = useState<any>(null);

  useEffect(() => {
    loadBookings();
  }, [page, statusFilter]);

  async function loadBookings() {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
      });
      if (statusFilter) params.append('status', statusFilter);
      if (search) params.append('search', search);

      const res = await fetch(`/api/admin/bookings?${params}`);
      const data = await res.json();
      if (data.ok) {
        setBookings(data.bookings);
        setPagination(data.pagination);
      }
    } catch (err) {
      console.error('Failed to load bookings:', err);
    } finally {
      setLoading(false);
    }
  }

  async function updateBooking(bookingId: string, updates: any) {
    try {
      const res = await fetch('/api/admin/bookings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, updates }),
      });
      const data = await res.json();
      if (data.ok) {
        loadBookings();
        setEditingBooking(null);
      } else {
        alert(data.error);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update booking');
    }
  }

  async function deleteBooking(bookingId: string) {
    if (!confirm(`Are you sure you want to delete this booking? This cannot be undone.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/bookings?bookingId=${bookingId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.ok) {
        loadBookings();
      } else {
        alert(data.error);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete booking');
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Bookings Management</h1>
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Search by email..."
            className="border rounded px-4 py-2 w-64"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadBookings()}
          />
          <select
            className="border rounded px-4 py-2"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELED">Canceled</option>
          </select>
          <button
            onClick={loadBookings}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Search
          </button>
        </div>
      </div>

      {loading ? (
        <div>Loading bookings...</div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reader</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date & Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {bookings.map((booking) => {
                  const duration = Math.round((new Date(booking.endTime).getTime() - new Date(booking.startTime).getTime()) / 1000 / 60);
                  return (
                    <tr key={booking.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-xs text-gray-600 font-mono">
                        {booking.id.substring(0, 12)}...
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div>{booking.User_Booking_actorIdToUser.displayName || '-'}</div>
                        <div className="text-xs text-gray-500">{booking.User_Booking_actorIdToUser.email}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div>{booking.User_Booking_readerIdToUser.displayName || '-'}</div>
                        <div className="text-xs text-gray-500">{booking.User_Booking_readerIdToUser.email}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {new Date(booking.startTime).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {duration} min
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          booking.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                          booking.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-800' :
                          booking.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {booking.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        ${((booking.totalPriceCents || 0) / 100).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <button
                          onClick={() => setEditingBooking(booking)}
                          className="text-blue-600 hover:text-blue-800 mr-4"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteBooking(booking.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Showing {((page - 1) * pagination.limit) + 1} to {Math.min(page * pagination.limit, pagination.total)} of {pagination.total} bookings
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="px-4 py-2">Page {page} of {pagination.totalPages}</span>
                <button
                  onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                  disabled={page === pagination.totalPages}
                  className="px-4 py-2 border rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Edit Modal */}
      {editingBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Edit Booking</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select
                  className="w-full border rounded px-3 py-2"
                  defaultValue={editingBooking.status}
                  onChange={(e) => editingBooking.status = e.target.value}
                >
                  <option value="PENDING">Pending</option>
                  <option value="CONFIRMED">Confirmed</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELED">Canceled</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Admin Notes</label>
                <textarea
                  className="w-full border rounded px-3 py-2 h-24"
                  defaultValue={editingBooking.notes || ''}
                  onChange={(e) => editingBooking.notes = e.target.value}
                  placeholder="Add internal notes about this booking..."
                />
              </div>

              <div className="bg-gray-50 p-3 rounded text-sm">
                <p><strong>Actor:</strong> {editingBooking.User_Booking_actorIdToUser.email}</p>
                <p><strong>Reader:</strong> {editingBooking.User_Booking_readerIdToUser.email}</p>
                <p><strong>Time:</strong> {new Date(editingBooking.startTime).toLocaleString()}</p>
                <p><strong>Price:</strong> ${((editingBooking.totalPriceCents || 0) / 100).toFixed(2)}</p>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => updateBooking(editingBooking.id, {
                  status: editingBooking.status,
                  notes: editingBooking.notes,
                })}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Save Changes
              </button>
              <button
                onClick={() => setEditingBooking(null)}
                className="flex-1 border px-4 py-2 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
