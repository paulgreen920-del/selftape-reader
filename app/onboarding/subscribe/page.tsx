"use client";

export const dynamic = "force-dynamic";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export default function SubscribePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const readerIdParam = (searchParams.get("readerId") ?? searchParams.get("id") ?? "").trim();

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [reader, setReader] = useState<any>(null);
  const [readerId, setReaderId] = useState<string>(readerIdParam);

  useEffect(() => {
    async function loadReader() {
      try {
        // If no readerId in URL, get it from current user
        if (!readerId) {
          const userRes = await fetch("/api/auth/me");
          const userData = await userRes.json();
          
          if (!userData.ok || !userData.user) {
            router.push("/login");
            return;
          }

          // User ID IS the reader ID in this schema (readers are users)
          const currentUserId = userData.user.id;

          // Fetch the full user/reader profile
          const readerRes = await fetch(`/api/readers?id=${currentUserId}`, {
            cache: 'no-store'
          });
          const readerData = await readerRes.json();
          
          if (readerData.ok && readerData.reader) {
            setReader(readerData.reader);
            setReaderId(readerData.reader.id);
            
            // If subscription is already active, redirect to dashboard
            if (readerData.reader.subscriptionStatus === 'active') {
              console.log('Active subscription detected, redirecting to dashboard...');
              setTimeout(() => {
                window.location.href = '/dashboard';
              }, 1500);
            }
          } else {
            // No reader profile found, redirect to create one
            router.push("/onboarding/reader");
            return;
          }
        } else {
          // readerId provided in URL, fetch that reader
          const res = await fetch(`/api/readers?id=${readerId}`, {
            cache: 'no-store'
          });
          const data = await res.json();
          if (data.ok && data.reader) {
            setReader(data.reader);
            
            // If subscription is already active, complete onboarding automatically
            if (data.reader.subscriptionStatus === 'active') {
              console.log('Active subscription detected, completing onboarding...');
              await fetch('/api/readers/update-step', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ readerId, step: null }),
              });
              // Redirect to dashboard after brief delay
              setTimeout(() => {
                window.location.href = '/dashboard';
              }, 1500);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load reader:", err);
      } finally {
        setInitialLoading(false);
      }
    }
    loadReader();
  }, [readerId, router]);

  const hasActiveSubscription = reader?.subscriptionStatus === "active";

  async function startSubscription() {
    if (!readerId || !reader?.email) {
      alert("Missing reader information. Please complete your profile first.");
      router.push("/onboarding/reader");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/subscription/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          readerId,
          email: reader.email 
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to start subscription checkout");
      }

      // Redirect to Stripe Checkout
      window.location.href = data.checkoutUrl;
    } catch (err: any) {
      alert(err.message || "Failed to start subscription");
      setLoading(false);
    }
  }

  async function skipForNow() {
    // Mark this step as skipped, then route to the next step
    await fetch('/api/onboarding/skip-step', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step: 'subscription-active' }),
    });
    router.push(`/onboarding/complete?readerId=${readerId}`);
  }

  if (initialLoading) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <p>Loading subscription details...</p>
      </div>
    );
  }

  if (!reader) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">Reader Profile Required</h1>
        <p className="text-gray-600 mb-4">
          You need to complete your reader profile before subscribing.
        </p>
        <button
          onClick={() => router.push("/onboarding/reader")}
          className="bg-emerald-600 text-white px-6 py-2 rounded hover:bg-emerald-700"
        >
          Complete Profile
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Final Step: Reader Membership</h1>
      <p className="text-sm text-gray-600 mb-6">
        Subscribe to activate your reader profile and start receiving bookings.
      </p>

      <div className="border rounded-lg p-6 bg-white mb-6">
        <div className="text-center mb-6">
          <div className="inline-flex items-baseline gap-2 mb-4">
            <span className="text-4xl font-bold text-emerald-600">$9.99</span>
            <span className="text-gray-600">/ month</span>
          </div>
          <p className="text-sm text-gray-600">
            Cancel anytime. First 7 days free!
          </p>
        </div>

        <div className="bg-emerald-50 rounded-lg p-6 mb-6">
          <h3 className="font-semibold mb-3 text-emerald-900">What's Included:</h3>
          <ul className="space-y-2 text-sm text-emerald-800">
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 mt-0.5">✓</span>
              <span>Appear in the reader marketplace</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 mt-0.5">✓</span>
              <span>Receive unlimited bookings</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 mt-0.5">✓</span>
              <span>Book other readers for your self-tapes</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 mt-0.5">✓</span>
              <span>Automated calendar sync & reminders</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 mt-0.5">✓</span>
              <span>Secure video conferencing included</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 mt-0.5">✓</span>
              <span>Keep 80% of your session fees (20% platform fee)</span>
            </li>
          </ul>
        </div>

        <button
          type="button"
          className="w-full bg-emerald-600 text-white rounded-lg px-6 py-3 text-lg font-semibold hover:bg-emerald-700 disabled:opacity-50 mb-3"
          onClick={startSubscription}
          disabled={loading || hasActiveSubscription}
        >
          {loading
            ? "Loading..."
            : hasActiveSubscription
            ? "✓ Subscription Active"
            : "Subscribe & Activate Profile"}
        </button>

        {hasActiveSubscription && (
          <button
            type="button"
            className="w-full bg-gray-600 text-white rounded-lg px-6 py-3 text-lg font-semibold hover:bg-gray-700 mb-3"
            onClick={async () => {
              await fetch('/api/readers/update-step', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ readerId, step: null }),
              });
              window.location.href = '/dashboard';
            }}
          >
            Complete Onboarding & Go to Dashboard
          </button>
        )}
        
        <button
          type="button"
          className="w-full text-sm text-gray-500 hover:text-gray-700"
          onClick={skipForNow}
        >
          Skip for now (profile will remain inactive)
        </button>
      </div>

      <div className="text-center text-xs text-gray-500">
        <p>Secure payment processed by Stripe</p>
        <p className="mt-1">By subscribing, you agree to our Terms of Service</p>
      </div>
    </div>
  );
}