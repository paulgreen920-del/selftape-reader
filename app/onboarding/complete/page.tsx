"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export const dynamic = "force-dynamic";

export default function CompletePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const readerId = (searchParams.get("readerId") ?? searchParams.get("id") ?? "").trim();
  const sessionId = searchParams.get("session_id");

  const [reader, setReader] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadReaderAndRefreshSession() {
      if (!readerId) return;

      try {
        console.log('🔄 Completing onboarding for:', readerId);
        console.log('Stripe session ID:', sessionId);
        
        // If coming from Stripe, verify and activate subscription
        if (sessionId) {
          console.log('Verifying Stripe session...');
          const verifyRes = await fetch('/api/subscription/verify-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, readerId }),
          });
          
          const verifyData = await verifyRes.json();
          console.log('Verification result:', verifyData);
          
          if (!verifyData.ok) {
            console.error('Failed to verify session:', verifyData.error);
            setError('Failed to verify subscription. Please contact support.');
          }
        }
        
        // Load reader data
        const res = await fetch(`/api/readers?id=${readerId}`, {
          cache: 'no-store'
        });
        const data = await res.json();
        if (data.ok && data.reader) {
          setReader(data.reader);
          console.log('Reader subscription status:', data.reader.subscriptionStatus);
        }

        // Clear onboarding step (user has completed onboarding)
        console.log('Clearing onboarding step...');
        await fetch('/api/readers/update-step', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ readerId, step: null }),
        });

        // Refresh session to get updated role
        await fetch("/api/auth/refresh-session", { method: "POST" });
        
        console.log("✅ Onboarding completed successfully");
      } catch (err) {
        console.error("Failed to complete onboarding:", err);
        setError('An error occurred. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    loadReaderAndRefreshSession();
  }, [readerId, sessionId]);

  return (
    <div className="max-w-3xl mx-auto p-6 text-center">
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}
      
      <div className="mb-8">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-emerald-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h1 className="text-3xl font-bold mb-2">Welcome to the Readers Community!</h1>
        <p className="text-gray-600">
          {loading
            ? "Completing your subscription..."
            : `Congratulations ${reader?.displayName || ""}! Your profile is complete.`}
        </p>
      </div>

      <div className="bg-white border rounded-lg p-6 mb-6">
        <h2 className="font-semibold mb-4">What's Next?</h2>
        <ul className="text-left space-y-3 text-sm text-gray-700">
          <li className="flex items-start gap-2">
            <span className="text-emerald-600 mt-0.5">✓</span>
            <span>Profile created with your headshot and bio</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-600 mt-0.5">✓</span>
            <span>Google Calendar connected for automatic scheduling</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-600 mt-0.5">✓</span>
            <span>Availability set - actors can now book your open time slots</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-600 mt-0.5">✓</span>
            <span>Stripe Connect enabled - you'll receive payments automatically</span>
          </li>
        </ul>
      </div>

      <div className="flex gap-3 justify-center">
        <button
          type="button"
          className="border rounded px-6 py-2"
          onClick={() => router.push("/dashboard")}
        >
          View My Profile
        </button>
        <button
          type="button"
          className="bg-emerald-600 text-white rounded px-6 py-2 hover:bg-emerald-700"
          onClick={() => router.push("/dashboard")}
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}
