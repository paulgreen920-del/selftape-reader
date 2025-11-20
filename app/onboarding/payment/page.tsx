"use client";

export const dynamic = "force-dynamic";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export default function PaymentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [stripeConnected, setStripeConnected] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);

  // Check if user already has Stripe connected
  useEffect(() => {
    async function checkStripeStatus() {
      try {
        const userRes = await fetch('/api/auth/me', { cache: 'no-store' });
        const userData = await userRes.json();
        
        if (!userData.user) {
          setCheckingStatus(false);
          return;
        }

        const res = await fetch(`/api/readers?email=${userData.user.email}`, { cache: 'no-store' });
        const data = await res.json();
        const accountId = data.reader?.stripeAccountId;
        
        if (data.ok && accountId) {
          const statusRes = await fetch(`/api/stripe/account-status?accountId=${accountId}`);
          const status = await statusRes.json();
          
          if (status.ok && status.details_submitted) {
            setStripeConnected(true);
            setCheckingStatus(false);
            // Auto-advance to subscription if coming back from Stripe
            setTimeout(() => {
              continueToSubscribe();
            }, 2000);
            return;
          }
        }
        setStripeConnected(false);
        setCheckingStatus(false);
      } catch (err) {
        setStripeConnected(false);
        setCheckingStatus(false);
      }
    }
    checkStripeStatus();
  }, []);

  async function connectStripe() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to start Stripe onboarding");
      }

      // Redirect to Stripe
      window.location.href = data.url;
    } catch (err: any) {
      alert(err.message || "Failed to connect Stripe");
      setLoading(false);
    }
  }

  async function continueToSubscribe() {
    window.location.href = '/onboarding/subscribe';
  }

  if (checkingStatus) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <p>Checking Stripe status...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Set Up Payments</h1>
      <p className="text-sm text-gray-600 mb-6">
        Connect your Stripe account to receive payments from actors who book sessions with you.
      </p>

      {stripeConnected && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <h3 className="font-semibold text-emerald-900 mb-1">Stripe Account Connected!</h3>
              <p className="text-sm text-emerald-800">
                Your payment account is set up. Click Continue to complete your reader profile activation.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="border rounded-lg p-6 bg-white">
        <h2 className="font-semibold mb-2">Stripe Connect</h2>
        <p className="text-sm text-gray-600 mb-4">
          Stripe handles all payments securely. You'll be redirected to Stripe to complete your account setup.
        </p>

        {!stripeConnected ? (
          <button
            type="button"
            className="bg-emerald-600 text-white rounded px-4 py-2 hover:bg-emerald-700 disabled:opacity-50"
            onClick={connectStripe}
            disabled={loading}
          >
            {loading ? "Connecting..." : "Connect with Stripe"}
          </button>
        ) : (
          <button
            type="button"
            className="bg-emerald-600 text-white rounded px-4 py-2 hover:bg-emerald-700"
            onClick={continueToSubscribe}
          >
            Continue to Subscription
          </button>
        )}
      </div>

      <div className="mt-6 flex gap-3">
        <button
          type="button"
          className="border rounded px-4 py-2"
          onClick={() => router.push('/onboarding/availability')}
        >
          Back
        </button>
        <button
          type="button"
          onClick={() => router.push('/dashboard')}
          className="border border-gray-300 rounded px-4 py-2 text-gray-700 hover:bg-gray-50"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}