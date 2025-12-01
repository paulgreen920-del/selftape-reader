"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type SubscriptionData = {
  status: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
};

export default function SubscriptionSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [user, setUser] = useState<any>(null);
  const [canceling, setCanceling] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        // Get current user
        const userRes = await fetch("/api/auth/me");
        const userData = await userRes.json();
        
        if (!userData.ok || !userData.user) {
          router.push("/login");
          return;
        }

        setUser(userData.user);

        // Get subscription details
        const subRes = await fetch("/api/subscription/status");
        const subData = await subRes.json();
        
        if (subData.ok) {
          setSubscription(subData.subscription);
        }
      } catch (err) {
        console.error("Failed to load subscription:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [router]);

  const handleCancelSubscription = async () => {
    if (!confirm("Are you sure you want to cancel your subscription? You'll lose access at the end of your billing period.")) {
      return;
    }

    setCanceling(true);
    try {
      const res = await fetch("/api/subscription/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();
      
      if (data.ok) {
        alert("Subscription canceled. You'll have access until the end of your billing period.");
        window.location.reload();
      } else {
        throw new Error(data.error || "Failed to cancel");
      }
    } catch (err: any) {
      alert(err.message || "Failed to cancel subscription");
    } finally {
      setCanceling(false);
    }
  };

  const handleReactivate = async () => {
    setCanceling(true);
    try {
      const res = await fetch("/api/subscription/reactivate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();
      
      if (data.ok) {
        alert("Subscription reactivated!");
        window.location.reload();
      } else {
        throw new Error(data.error || "Failed to reactivate");
      }
    } catch (err: any) {
      alert(err.message || "Failed to reactivate subscription");
    } finally {
      setCanceling(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="mb-4">
          <Link href="/dashboard" className="text-blue-600 hover:underline text-sm">
            ← Back to Dashboard
          </Link>
        </div>
        <p>Loading subscription details...</p>
      </div>
    );
  }

  if (user?.role !== "READER" && user?.role !== "ADMIN") {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="mb-4">
          <Link href="/dashboard" className="text-blue-600 hover:underline text-sm">
            ← Back to Dashboard
          </Link>
        </div>
        <h1 className="text-2xl font-bold mb-4">Subscription</h1>
        <p className="text-gray-600">You don't have an active reader subscription.</p>
        <button
          className="mt-4 bg-emerald-600 text-white px-6 py-2 rounded hover:bg-emerald-700"
          onClick={() => router.push("/onboarding/reader")}
        >
          Become a Reader
        </button>
      </div>
    );
  }

  // Check if subscription is active (has a valid status)
  const hasActiveSubscription = subscription?.status === "active" || subscription?.status === "trialing";
  const isInactive = !subscription || subscription.status === "inactive" || subscription.status === "canceled" || !subscription.status;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-4">
        <Link href="/dashboard" className="text-blue-600 hover:underline text-sm">
          ← Back to Dashboard
        </Link>
      </div>
      <h1 className="text-2xl font-bold mb-6">Subscription Management</h1>

      <div className="bg-white border rounded-lg p-6 mb-6">
        {/* Header - stack on mobile */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-semibold">Reader Membership</h2>
            <p className="text-sm text-gray-600">$9.99/month</p>
          </div>
          <div className={`px-3 py-1 rounded text-sm font-medium w-fit ${
            hasActiveSubscription
              ? subscription?.cancelAtPeriodEnd
                ? "bg-yellow-100 text-yellow-700"
                : "bg-emerald-100 text-emerald-700"
              : "bg-gray-100 text-gray-700"
          }`}>
            {hasActiveSubscription
              ? subscription?.cancelAtPeriodEnd 
                ? "Canceling" 
                : "Active"
              : "Inactive"}
          </div>
        </div>

        {/* Show different content based on subscription status */}
        {isInactive ? (
          // No active subscription - show subscribe button
          <div>
            <p className="text-sm text-gray-600 mb-4">
              You don't have an active subscription. Subscribe to appear in the marketplace and start accepting bookings.
            </p>
            <Link
              href="/onboarding/subscribe"
              className="inline-block bg-emerald-600 text-white px-6 py-2 rounded hover:bg-emerald-700 font-medium"
            >
              Subscribe Now
            </Link>
          </div>
        ) : (
          // Has active subscription - show renewal info and cancel/reactivate buttons
          <>
            {subscription?.currentPeriodEnd && (
              <p className="text-sm text-gray-600 mb-4">
                {subscription.cancelAtPeriodEnd 
                  ? `Access ends: ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`
                  : `Renews: ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`
                }
              </p>
            )}

            <div className="flex flex-wrap gap-3">
              {subscription?.cancelAtPeriodEnd ? (
                <button
                  className="border rounded px-4 py-2 hover:bg-gray-50 disabled:opacity-50"
                  onClick={handleReactivate}
                  disabled={canceling}
                >
                  {canceling ? "Processing..." : "Reactivate Subscription"}
                </button>
              ) : (
                <button
                  className="border border-red-300 text-red-600 rounded px-4 py-2 hover:bg-red-50 disabled:opacity-50"
                  onClick={handleCancelSubscription}
                  disabled={canceling}
                >
                  {canceling ? "Processing..." : "Cancel Subscription"}
                </button>
              )}
            </div>
          </>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">Need help?</h3>
        <p className="text-sm text-blue-700">
          Contact support at support@selftape-reader.com
        </p>
      </div>
    </div>
  );
}