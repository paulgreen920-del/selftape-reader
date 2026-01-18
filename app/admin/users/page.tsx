'use client';

import { useEffect, useState } from 'react';

// Available columns for export
const EXPORT_COLUMNS = [
  { key: 'email', label: 'Email', category: 'Basic', default: true },
  { key: 'displayName', label: 'Display Name', category: 'Basic', default: true },
  { key: 'role', label: 'Role', category: 'Basic', default: true },
  { key: 'isActive', label: 'Active Status', category: 'Basic', default: true },
  { key: 'emailVerified', label: 'Email Verified', category: 'Basic', default: false },
  { key: 'phone', label: 'Phone', category: 'Contact', default: false },
  { key: 'city', label: 'City', category: 'Contact', default: false },
  { key: 'timezone', label: 'Timezone', category: 'Contact', default: false },
  { key: 'bio', label: 'Bio', category: 'Profile', default: false },
  { key: 'gender', label: 'Gender', category: 'Profile', default: false },
  { key: 'playableAgeMin', label: 'Playable Age Min', category: 'Profile', default: false },
  { key: 'playableAgeMax', label: 'Playable Age Max', category: 'Profile', default: false },
  { key: 'ratePer15Min', label: 'Rate (15 min)', category: 'Rates', default: false },
  { key: 'ratePer30Min', label: 'Rate (30 min)', category: 'Rates', default: false },
  { key: 'ratePer60Min', label: 'Rate (60 min)', category: 'Rates', default: false },
  { key: 'subscriptionStatus', label: 'Subscription Status', category: 'Billing', default: true },
  { key: 'stripeAccountId', label: 'Stripe Account ID', category: 'Billing', default: false },
  { key: 'stripeCustomerId', label: 'Stripe Customer ID', category: 'Billing', default: false },
  { key: 'calendarConnected', label: 'Calendar Connected', category: 'Setup', default: false },
  { key: 'calendarType', label: 'Calendar Type', category: 'Setup', default: false },
  { key: 'createdAt', label: 'Created At', category: 'Dates', default: true },
  { key: 'updatedAt', label: 'Updated At', category: 'Dates', default: false },
  { key: 'totalBookingsAsReader', label: 'Bookings as Reader', category: 'Stats', default: false },
  { key: 'totalBookingsAsActor', label: 'Bookings as Actor', category: 'Stats', default: false },
  { key: 'availabilityTemplateCount', label: 'Availability Templates', category: 'Stats', default: false },
  { key: 'upcomingSlotCount', label: 'Upcoming Slots', category: 'Stats', default: false },
];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [subscriptionFilter, setSubscriptionFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);
  const [editingUser, setEditingUser] = useState<any>(null);

  // Export state
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(
    new Set(EXPORT_COLUMNS.filter(c => c.default).map(c => c.key))
  );
  const [includeBookings, setIncludeBookings] = useState(false);
  const [includeTemplates, setIncludeTemplates] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadUsers();
  }, [page, roleFilter, statusFilter, subscriptionFilter]);

  // Clear selections when filters change
  useEffect(() => {
    setSelectedUsers(new Set());
  }, [roleFilter, statusFilter, subscriptionFilter, filter]);

  async function loadUsers() {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
      });
      if (roleFilter) params.append('role', roleFilter);
      if (statusFilter) params.append('status', statusFilter);
      if (subscriptionFilter) params.append('subscription', subscriptionFilter);
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

  // Selection handlers
  function toggleSelectAll() {
    if (selectedUsers.size === users.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(users.map(u => u.id)));
    }
  }

  function toggleSelectUser(userId: string) {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  }

  function toggleColumn(key: string) {
    const newSelected = new Set(selectedColumns);
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    setSelectedColumns(newSelected);
  }

  function selectAllColumns() {
    setSelectedColumns(new Set(EXPORT_COLUMNS.map(c => c.key)));
  }

  function selectDefaultColumns() {
    setSelectedColumns(new Set(EXPORT_COLUMNS.filter(c => c.default).map(c => c.key)));
  }

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch('/api/admin/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userIds: selectedUsers.size > 0 ? Array.from(selectedUsers) : null,
          columns: Array.from(selectedColumns),
          includeBookings,
          includeTemplates,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Export failed');
      }

      // Download the CSV
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setShowExportModal(false);
    } catch (err: any) {
      alert(err.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  }

  // Group columns by category for display
  const columnsByCategory = EXPORT_COLUMNS.reduce((acc, col) => {
    if (!acc[col.category]) acc[col.category] = [];
    acc[col.category].push(col);
    return acc;
  }, {} as Record<string, typeof EXPORT_COLUMNS>);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">User Management</h1>
        <button
          onClick={() => setShowExportModal(true)}
          className="bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-700 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export {selectedUsers.size > 0 ? `(${selectedUsers.size} selected)` : 'All'}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <input
            type="text"
            placeholder="Search by email or name..."
            className="border rounded px-4 py-2"
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
          <select
            className="border rounded px-4 py-2"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select
            className="border rounded px-4 py-2"
            value={subscriptionFilter}
            onChange={(e) => {
              setSubscriptionFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Subscriptions</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="canceled">Canceled</option>
            <option value="none">None</option>
          </select>
          <button
            onClick={loadUsers}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Search
          </button>
        </div>
      </div>

      {/* Selection summary */}
      {selectedUsers.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 flex items-center justify-between">
          <span className="text-blue-800">
            {selectedUsers.size} user{selectedUsers.size !== 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedUsers(new Set())}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              Clear Selection
            </button>
            <button
              onClick={() => setShowExportModal(true)}
              className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
            >
              Export Selected
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div>Loading users...</div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full table-fixed">
              <thead className="bg-gray-50">
                <tr>
                  <th className="w-10 px-2 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={users.length > 0 && selectedUsers.size === users.length}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                  </th>
                  <th className="w-48 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="w-36 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="w-20 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                  <th className="w-20 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="w-24 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subscription</th>
                  <th className="w-24 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Onboarding</th>
                  <th className="w-24 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map((user) => (
                  <tr 
                    key={user.id} 
                    className={`hover:bg-gray-50 ${selectedUsers.has(user.id) ? 'bg-blue-50' : ''}`}
                  >
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedUsers.has(user.id)}
                        onChange={() => toggleSelectUser(user.id)}
                        className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-900 truncate">{user.email}</td>
                    <td className="px-3 py-4 text-sm text-gray-900 truncate">{user.displayName || user.name || '-'}</td>
                    <td className="px-3 py-4 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        user.isAdmin ? 'bg-purple-100 text-purple-800' :
                        user.role === 'READER' ? 'bg-emerald-100 text-emerald-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        user.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        user.subscriptionStatus === 'active' ? 'bg-emerald-100 text-emerald-800' :
                        user.subscriptionStatus === 'inactive' ? 'bg-gray-100 text-gray-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {user.subscriptionStatus || 'none'}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-600">
                      {user.onboardingStep || 'Complete'}
                    </td>
                    <td className="px-3 py-4 text-sm">
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

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Export Users</h2>
              <button
                onClick={() => setShowExportModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Export scope */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium mb-2">Export Scope</h3>
              <p className="text-sm text-gray-600">
                {selectedUsers.size > 0 
                  ? `Exporting ${selectedUsers.size} selected user${selectedUsers.size !== 1 ? 's' : ''}`
                  : `Exporting all ${pagination?.total || users.length} users${roleFilter || statusFilter || subscriptionFilter ? ' (matching current filters)' : ''}`
                }
              </p>
            </div>

            {/* Column selection */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium">Select Columns</h3>
                <div className="flex gap-2">
                  <button
                    onClick={selectAllColumns}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Select All
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    onClick={selectDefaultColumns}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Reset to Default
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {Object.entries(columnsByCategory).map(([category, columns]) => (
                  <div key={category} className="border rounded-lg p-3">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">{category}</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {columns.map((col) => (
                        <label key={col.key} className="flex items-center gap-2 text-sm cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedColumns.has(col.key)}
                            onChange={() => toggleColumn(col.key)}
                            className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                          />
                          {col.label}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Include related data */}
            <div className="mb-6">
              <h3 className="font-medium mb-3">Include Related Data</h3>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeBookings}
                    onChange={(e) => setIncludeBookings(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <span className="font-medium">Include Bookings</span>
                    <p className="text-sm text-gray-500">Export booking history (as reader and as actor)</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeTemplates}
                    onChange={(e) => setIncludeTemplates(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <span className="font-medium">Include Availability Templates</span>
                    <p className="text-sm text-gray-500">Export weekly availability schedules</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Export button */}
            <div className="flex gap-3">
              <button
                onClick={handleExport}
                disabled={exporting || selectedColumns.size === 0}
                className="flex-1 bg-emerald-600 text-white px-4 py-3 rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {exporting ? (
                  <>
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                    </svg>
                    Exporting...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download CSV
                  </>
                )}
              </button>
              <button
                onClick={() => setShowExportModal(false)}
                className="px-6 py-3 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 overflow-y-auto z-50">
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