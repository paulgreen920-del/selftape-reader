'use client';

import { useEffect, useState } from 'react';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);
  const [editingUser, setEditingUser] = useState<any>(null);

  useEffect(() => {
    loadUsers();
  }, [page, roleFilter]);

  async function loadUsers() {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
      });
      if (roleFilter) params.append('role', roleFilter);
      if (filter) params.append('search', filter);

      const res = await fetch(`/api/admin/users?${params}`);
      const data = await res.json();
      if (data.ok) {
        setUsers(data.users);
        setPagination(data.pagination);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  }

  async function updateUser(userId: string, updates: any) {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, updates }),
      });
      const data = await res.json();
      if (data.ok) {
        loadUsers();
        setEditingUser(null);
      } else {
        alert(data.error);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update user');
    }
  }

  async function deleteUser(userId: string, email: string) {
    if (!confirm(`Are you sure you want to delete user ${email}? This cannot be undone.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/users?userId=${userId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.ok) {
        loadUsers();
      } else {
        alert(data.error);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete user');
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">User Management</h1>
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Search by email or name..."
            className="border rounded px-4 py-2 w-64"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadUsers()}
          />
          <select
            className="border rounded px-4 py-2"
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Roles</option>
            <option value="ACTOR">Actors</option>
            <option value="READER">Readers</option>
            <option value="ADMIN">Admins</option>
          </select>
          <button
            onClick={loadUsers}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Search
          </button>
        </div>
      </div>

      {loading ? (
        <div>Loading users...</div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subscription</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Onboarding</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">{user.email}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{user.displayName || user.name || '-'}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' :
                        user.role === 'READER' ? 'bg-emerald-100 text-emerald-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        user.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        user.subscriptionStatus === 'active' ? 'bg-emerald-100 text-emerald-800' :
                        user.subscriptionStatus === 'inactive' ? 'bg-gray-100 text-gray-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {user.subscriptionStatus || 'none'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {user.onboardingStep || 'Complete'}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <button
                        onClick={() => setEditingUser(user)}
                        className="text-blue-600 hover:text-blue-800 mr-4"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteUser(user.id, user.email)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Showing {((page - 1) * pagination.limit) + 1} to {Math.min(page * pagination.limit, pagination.total)} of {pagination.total} users
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
      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl my-8">
            <h2 className="text-xl font-bold mb-4">Edit User: {editingUser.email}</h2>
            
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input
                    type="email"
                    className="w-full border rounded px-3 py-2"
                    defaultValue={editingUser.email}
                    onChange={(e) => editingUser.email = e.target.value}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Display Name</label>
                  <input
                    type="text"
                    className="w-full border rounded px-3 py-2"
                    defaultValue={editingUser.displayName || ''}
                    onChange={(e) => editingUser.displayName = e.target.value}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Role</label>
                  <select
                    className="w-full border rounded px-3 py-2"
                    defaultValue={editingUser.role}
                    onChange={(e) => editingUser.role = e.target.value}
                  >
                    <option value="ACTOR">Actor</option>
                    <option value="READER">Reader</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <select
                    className="w-full border rounded px-3 py-2"
                    defaultValue={editingUser.isActive ? 'active' : 'inactive'}
                    onChange={(e) => editingUser.isActive = e.target.value === 'active'}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Subscription Status</label>
                  <select
                    className="w-full border rounded px-3 py-2"
                    defaultValue={editingUser.subscriptionStatus || 'inactive'}
                    onChange={(e) => editingUser.subscriptionStatus = e.target.value}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="canceled">Canceled</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Onboarding Step</label>
                  <select
                    className="w-full border rounded px-3 py-2"
                    defaultValue={editingUser.onboardingStep || 'null'}
                    onChange={(e) => editingUser.onboardingStep = e.target.value === 'null' ? null : e.target.value}
                  >
                    <option value="null">Complete</option>
                    <option value="schedule">Schedule</option>
                    <option value="availability">Availability</option>
                    <option value="payment">Payment</option>
                    <option value="subscribe">Subscribe</option>
                  </select>
                </div>
              </div>


              <div>
                <label className="block text-sm font-medium mb-1">Headshot URL</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="url"
                    className="w-full border rounded px-3 py-2"
                    defaultValue={editingUser.headshotUrl || ''}
                    onChange={(e) => editingUser.headshotUrl = e.target.value}
                    placeholder="https://example.com/headshot.jpg"
                  />
                  <input
                    type="file"
                    accept="image/*"
                    title="Upload headshot"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 4 * 1024 * 1024) {
                        alert('Please upload an image no larger than 4MB.');
                        return;
                      }
                      const fd = new FormData();
                      fd.append('file', file);
                      try {
                        const res = await fetch('/api/uploads', { method: 'POST', body: fd });
                        const data = await res.json();
                        if (!res.ok || !data?.absoluteUrl) throw new Error(data?.error || 'Upload failed');
                        editingUser.headshotUrl = data.absoluteUrl;
                        // Optionally, update the input value visually (if using refs or state)
                        alert('Headshot uploaded! URL set.');
                      } catch (err) {
                        alert('Upload failed.');
                      }
                    }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Paste a URL or upload an image (max 4MB).</p>
                {editingUser.headshotUrl && (
                  <div className="mt-2"><img src={editingUser.headshotUrl} alt="Headshot preview" className="h-20 w-20 object-cover rounded" /></div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Bio</label>
                <textarea
                  className="w-full border rounded px-3 py-2 h-24"
                  defaultValue={editingUser.bio || ''}
                  onChange={(e) => editingUser.bio = e.target.value}
                  placeholder="User bio..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Phone</label>
                  <input
                    type="tel"
                    className="w-full border rounded px-3 py-2"
                    defaultValue={editingUser.phone || ''}
                    onChange={(e) => editingUser.phone = e.target.value}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">City</label>
                  <input
                    type="text"
                    className="w-full border rounded px-3 py-2"
                    defaultValue={editingUser.city || ''}
                    onChange={(e) => editingUser.city = e.target.value}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Timezone</label>
                <input
                  type="text"
                  className="w-full border rounded px-3 py-2"
                  defaultValue={editingUser.timezone || ''}
                  onChange={(e) => editingUser.timezone = e.target.value}
                  placeholder="America/New_York"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Stripe Account ID</label>
                  <input
                    type="text"
                    className="w-full border rounded px-3 py-2 text-xs"
                    defaultValue={editingUser.stripeAccountId || ''}
                    onChange={(e) => editingUser.stripeAccountId = e.target.value}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Stripe Customer ID</label>
                  <input
                    type="text"
                    className="w-full border rounded px-3 py-2 text-xs"
                    defaultValue={editingUser.stripeCustomerId || ''}
                    onChange={(e) => editingUser.stripeCustomerId = e.target.value}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Subscription ID</label>
                  <input
                    type="text"
                    className="w-full border rounded px-3 py-2 text-xs"
                    defaultValue={editingUser.subscriptionId || ''}
                    onChange={(e) => editingUser.subscriptionId = e.target.value}
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => updateUser(editingUser.id, {
                  email: editingUser.email,
                  displayName: editingUser.displayName,
                  role: editingUser.role,
                  isActive: editingUser.isActive,
                  subscriptionStatus: editingUser.subscriptionStatus,
                  onboardingStep: editingUser.onboardingStep,
                  headshotUrl: editingUser.headshotUrl,
                  bio: editingUser.bio,
                  phone: editingUser.phone,
                  city: editingUser.city,
                  timezone: editingUser.timezone,
                  stripeAccountId: editingUser.stripeAccountId,
                  stripeCustomerId: editingUser.stripeCustomerId,
                  subscriptionId: editingUser.subscriptionId,
                })}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Save Changes
              </button>
              <button
                onClick={() => setEditingUser(null)}
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
