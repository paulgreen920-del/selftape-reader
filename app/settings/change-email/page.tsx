"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ChangeEmailPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"input" | "verification">("input");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/change-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newEmail,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to initiate email change');
      }

      setStep("verification");
    } catch (err: any) {
      setError(err.message || 'Failed to change email');
    } finally {
      setLoading(false);
    }
  };

  if (step === "verification") {
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
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="text-4xl mb-4">📧</div>
            <h1 className="text-2xl font-bold mb-4">Check Your Email</h1>
            <p className="text-gray-600 mb-6">
              We've sent a verification link to <strong>{newEmail}</strong>. 
              Click the link in your email to complete the email change.
            </p>
            <div className="space-y-3">
              <p className="text-sm text-gray-500">
                The verification link will expire in 24 hours.
              </p>
              <Link
                href="/dashboard"
                className="inline-block px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg"
              >
                Return to Dashboard
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

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
          <h1 className="text-2xl font-bold mb-6">Change Email Address</h1>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">New Email Address</label>
              <input
                type="email"
                className="border rounded px-3 py-2 w-full"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="your-new-email@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Current Password</label>
              <input
                type="password"
                className="border rounded px-3 py-2 w-full"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter your current password to confirm"
                required
              />
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg disabled:opacity-50"
              >
                {loading ? "Sending..." : "Change Email"}
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
            <h3 className="text-sm font-medium mb-2">Important:</h3>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• You'll need to verify the new email address</li>
              <li>• Your current email will remain active until verified</li>
              <li>• All services (Stripe, calendar) will be updated after verification</li>
              <li>• You'll receive a confirmation email at both addresses</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}