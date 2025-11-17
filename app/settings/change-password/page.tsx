"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters long");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    if (currentPassword === newPassword) {
      setError("New password must be different from current password");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to change password');
      }

      alert('Password changed successfully!');
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/reader/profile" className="text-blue-600 hover:underline text-sm">
            ← Back to Profile
          </Link>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold mb-6">Change Password</h1>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Current Password</label>
              <input
                type="password"
                className="border rounded px-3 py-2 w-full"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">New Password</label>
              <input
                type="password"
                className="border rounded px-3 py-2 w-full"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={8}
                required
              />
              <p className="text-xs text-gray-500 mt-1">Must be at least 8 characters</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Confirm New Password</label>
              <input
                type="password"
                className="border rounded px-3 py-2 w-full"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg disabled:opacity-50"
              >
                {loading ? "Changing..." : "Change Password"}
              </button>
              <Link
                href="/reader/profile"
                className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg"
              >
                Cancel
              </Link>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t">
            <h3 className="text-sm font-medium mb-2">Password Requirements:</h3>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• At least 8 characters long</li>
              <li>• Different from current password</li>
              <li>• Should include letters and numbers</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}