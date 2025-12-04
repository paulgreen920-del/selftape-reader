// app/onboarding/schedule/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

type ReaderLite = { id: string; displayName: string | null; email: string | null };

export default function OnboardingSchedulePage() {
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [pendingProvider, setPendingProvider] = useState<"GOOGLE" | "MICROSOFT" | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  // Disconnect current calendar connection
  async function disconnectCalendarAndContinue() {
    setDisconnecting(true);
    try {
      const res = await fetch("/api/calendar/disconnect", { method: "POST" });
      if (res.ok) {
        setGoogleConnected(false);
        setMicrosoftConnected(false);
        setIcalConnections([]);
        setShowDisconnectModal(false);
        // Continue with pending provider
        if (pendingProvider === "GOOGLE") {
          goGoogle();
        } else if (pendingProvider === "MICROSOFT") {
          goMicrosoft();
        }
        setPendingProvider(null);
      } else {
        alert("Failed to disconnect calendar");
      }
    } catch (e) {
      alert("Failed to disconnect calendar");
    } finally {
      setDisconnecting(false);
    }
  }
  const searchParams = useSearchParams();
  const router = useRouter();

  // Accept readerId OR id
  const readerId = useMemo(() => {
    const rid = (searchParams.get("readerId") ?? searchParams.get("id") ?? "").trim();
    return rid;
  }, [searchParams]);

  const [reader, setReader] = useState<ReaderLite | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [err, setErr] = useState<string | null>(null);
  const [effectiveReaderId, setEffectiveReaderId] = useState<string>("");

  // --- Track calendar connection status from database
  const [googleConnected, setGoogleConnected] = useState<boolean>(false);
  const [microsoftConnected, setMicrosoftConnected] = useState<boolean>(false);
  const [icalConnections, setIcalConnections] = useState<Array<{ id: string; name: string; url: string }>>([]);
  const [showIcalInput, setShowIcalInput] = useState<boolean>(false);
  const [showAppleTutorial, setShowAppleTutorial] = useState(false);
  const [icalUrl, setIcalUrl] = useState<string>("");
  const [icalError, setIcalError] = useState<string>("");
  const [connectingIcal, setConnectingIcal] = useState<boolean>(false);
  const [checkingConnection, setCheckingConnection] = useState<boolean>(false);
  const [updatingStep, setUpdatingStep] = useState<boolean>(false);

  const firstName = useMemo(() => {
    const dn = (reader?.displayName || "").trim();
    if (dn) return dn.split(/\s+/)[0];
    const em = (reader?.email || "").trim();
    if (em && em.includes("@")) return em.split("@")[0];
    return "";
  }, [reader]);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setLoading(true);
      setErr(null);

      // If no readerId in URL, try to get from session
      let fetchedReaderId = readerId;
      if (!fetchedReaderId) {
        try {
          const meRes = await fetch('/api/auth/me');
          if (meRes.ok) {
            const meData = await meRes.json();
            if (meData.ok && meData.user?.id) {
              fetchedReaderId = meData.user.id;
              console.log('Got readerId from session:', fetchedReaderId);
            }
          }
        } catch (err) {
          console.error('Failed to fetch user from session:', err);
        }
      }

      if (!fetchedReaderId) {
        setErr("Missing readerId in the URL. Please return to onboarding and save your profile again.");
        setLoading(false);
        return;
      }

      // Store the effective readerId for use in other functions
      if (!ignore) setEffectiveReaderId(fetchedReaderId);

      try {
        const res = await fetch(`/api/readers?id=${encodeURIComponent(fetchedReaderId)}`, {
          headers: { Accept: "application/json" },
        });

        const raw = await res.text().catch(() => "");
        let data: any = null;
        try {
          data = raw ? JSON.parse(raw) : null;
        } catch {
          // non-JSON; ignore
        }

        if (!res.ok || !data?.ok || !data?.reader) {
          const msg =
            data?.error ||
            (raw
              ? `Failed to load reader (HTTP ${res.status}). Body: ${raw.slice(0, 200)}…`
              : `Failed to load reader (HTTP ${res.status}).`);
          throw new Error(msg);
        }

        if (!ignore) setReader(data.reader as ReaderLite);
      } catch (e: any) {
        if (!ignore) setErr(e?.message || "Failed to load reader.");
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, [readerId]);

  // --- Check calendar connection status from database
  useEffect(() => {
    async function checkConnection() {
      if (!effectiveReaderId) return;
      setCheckingConnection(true);
      try {
        const res = await fetch(`/api/calendar/connection?userId=${encodeURIComponent(effectiveReaderId)}`);
        const data = await res.json();
        if (data.connected) {
          if (data.provider === 'GOOGLE') {
            setGoogleConnected(true);
          } else if (data.provider === 'MICROSOFT') {
            setMicrosoftConnected(true);
          }
        }
        // Fetch Apple Calendar connections
        const icalRes = await fetch('/api/calendar/ical');
        const icalData = await icalRes.json();
        if (icalData.ok && Array.isArray(icalData.connections)) {
          setIcalConnections(icalData.connections);
        }
      } catch (e) {
        console.error('Failed to check calendar connection:', e);
      } finally {
        setCheckingConnection(false);
      }
    }
    checkConnection();
    // Also check if URL param indicates just connected
    const connectedParam = (searchParams.get("connected") || "").toLowerCase();
    if (connectedParam === "google") {
      setGoogleConnected(true);
    } else if (connectedParam === "microsoft") {
      setMicrosoftConnected(true);
    }
  }, [effectiveReaderId, searchParams]);

  // ---- Connect iCal feed
  async function connectIcal() {
    if (!icalUrl.trim()) {
      setIcalError("Please enter your iCal URL");
      return;
    }

    setConnectingIcal(true);
    setIcalError("");

    try {
      const id = effectiveReaderId || readerId;
      if (!id) {
        throw new Error("Missing readerId — please finish the previous step first.");
      }

      const res = await fetch('/api/calendar/ical/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ readerId: id, icalUrl: icalUrl.trim() }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Failed to connect iCal calendar');
      }

      // Apple Calendar connection is now tracked via icalConnections
      setShowIcalInput(false);
      setIcalUrl("");
    } catch (e: any) {
      setIcalError(e.message || "Could not connect iCal feed");
    } finally {
      setConnectingIcal(false);
    }
  }

  // ---- Start Google OAuth via our API
  async function goGoogle() {
    if (googleConnected || microsoftConnected || icalConnections.length > 0) {
      setPendingProvider("GOOGLE");
      setShowDisconnectModal(true);
      return;
    }
    try {
      const id = effectiveReaderId || readerId;
      if (!id) {
        alert("Missing readerId — please finish the previous step first.");
        return;
      }
      const res = await fetch(`/api/calendar/google/start?readerId=${encodeURIComponent(id)}`, {
        headers: { Accept: "application/json" },
      });
      const data = await res.json().catch(() => ({} as any));

      if (!res.ok || !data?.ok || !data?.authUrl) {
        throw new Error(data?.error || `Failed to start Google OAuth (HTTP ${res.status}).`);
      }

      window.location.href = data.authUrl as string; // go to Google consent screen
    } catch (e: any) {
      alert(e?.message || "Could not start Google connection.");
    }
  }

  // ---- Start Microsoft OAuth via our API
  async function goMicrosoft() {
    if (googleConnected || microsoftConnected || icalConnections.length > 0) {
      setPendingProvider("MICROSOFT");
      setShowDisconnectModal(true);
      return;
    }
    try {
      const id = effectiveReaderId || readerId;
      if (!id) {
        alert("Missing readerId — please finish the previous step first.");
        return;
      }
      const res = await fetch(`/api/calendar/microsoft/start?readerId=${encodeURIComponent(id)}`, {
        headers: { Accept: "application/json" },
      });
      const data = await res.json().catch(() => ({} as any));

      if (!res.ok || !data?.ok || !data?.authUrl) {
        throw new Error(data?.error || `Failed to start Microsoft OAuth (HTTP ${res.status}).`);
      }

      window.location.href = data.authUrl as string; // go to Microsoft consent screen
    } catch (e: any) {
      alert(e?.message || "Could not start Microsoft connection.");
    }
  }
  // Modal component
  function DisconnectModal() {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full">
          <h2 className="text-lg font-semibold mb-2">Only one calendar can be connected</h2>
          <p className="mb-4 text-gray-700">Would you like to disconnect your current calendar to connect a new one?</p>
          <div className="flex justify-end gap-3">
            <button
              className="px-4 py-2 rounded border text-gray-700 hover:bg-gray-100"
              onClick={() => { setShowDisconnectModal(false); setPendingProvider(null); }}
              disabled={disconnecting}
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              onClick={disconnectCalendarAndContinue}
              disabled={disconnecting}
            >
              {disconnecting ? "Disconnecting..." : "Disconnect"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      {showDisconnectModal && <DisconnectModal />}
      {/* Friendly header */}
      <h1 className="text-2xl sm:text-3xl font-bold">
        {loading
          ? "Welcome to the readers community…"
          : `Welcome to the readers community, ${firstName || "friend"}!`}
      </h1>
      <p className="text-sm text-gray-600 mt-2">
        Just a few more steps before you’re ready to help fellow actors with their self-tapes.
        We’ll sync bookings to your calendar and let actors book times you make available.
      </p>

      {/* Errors */}
      {err ? (
        <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600 text-sm">{err}</p>
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              className="rounded border px-3 py-1 text-sm"
              onClick={() => router.push("/onboarding/reader")}
            >
              Go back to onboarding
            </button>
            {readerId && (
              <a
                className="rounded border px-3 py-1 text-sm"
                href={`/api/readers?id=${encodeURIComponent(readerId)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open API response
              </a>
            )}
          </div>
        </div>
      ) : (
        !loading &&
        reader && (
          <p className="text-sm text-gray-500 mt-6">
            Setting up scheduling for <strong>{reader.displayName || reader.email}</strong>.
          </p>
        )
      )}

      {/* Calendar Sync */}
      <section className="mt-10">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">{(googleConnected || microsoftConnected || icalConnections.length > 0) ? "Calendar Connected" : "Connect your calendar"}</h2>
          {(googleConnected || microsoftConnected || icalConnections.length > 0) && (
            <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
              ✓ Calendar Connected
            </span>
          )}
        </div>
        {(googleConnected || microsoftConnected || icalConnections.length > 0) ? (
          <div className="mb-4">
            <p className="text-sm text-gray-600">Your calendar is synced to avoid double-bookings.</p>
            {googleConnected && <div className="text-xs text-emerald-700">Connected to Google Calendar</div>}
            {microsoftConnected && <div className="text-xs text-blue-700">Connected to Microsoft Outlook</div>}
            {icalConnections.length > 0 && (
              <div className="text-xs text-purple-700">Connected to Apple Calendar ({icalConnections.length} calendar{icalConnections.length > 1 ? "s" : ""} connected)</div>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-600 mb-4">Choose a provider to sync bookings automatically.</p>
        )}
        <div className="grid sm:grid-cols-3 gap-3">
          <button
            type="button"
            className={`rounded-xl border px-4 py-3 bg-white text-left ${googleConnected ? "border-green-500" : "hover:bg-gray-50"}`}
            onClick={googleConnected ? undefined : goGoogle}
            disabled={googleConnected || !!err || loading}
            title={googleConnected ? "Already connected" : err ? "Fix the error above first" : ""}
          >
            <div className="font-medium flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#4285F4]" viewBox="0 0 20 20" fill="currentColor"><rect width="20" height="20" rx="4" fill="#fff"/><path d="M6 2a2 2 0 0 0-2 2v1h12V4a2 2 0 0 0-2-2H6zm10 5H4v9a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7zm-2 3H6v2h8v-2z" fill="#4285F4"/></svg>
              Google Calendar {googleConnected && <span className="ml-2 text-green-600">✓ Connected</span>}
            </div>
            <div className="text-xs text-gray-500">
              {googleConnected ? "Connected" : "Use your Google account"}
            </div>
            {googleConnected && <button className="mt-2 text-xs text-blue-600 underline" onClick={() => setShowDisconnectModal(true)}>Manage</button>}
          </button>
          <button
            type="button"
            className={`rounded-xl border px-4 py-3 bg-white text-left ${microsoftConnected ? "border-green-500" : "hover:bg-gray-50"}`}
            onClick={microsoftConnected ? undefined : goMicrosoft}
            disabled={microsoftConnected || !!err || loading}
            title={microsoftConnected ? "Already connected" : err ? "Fix the error above first" : ""}
          >
            <div className="font-medium flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#0078D4]" viewBox="0 0 20 20" fill="currentColor"><rect width="20" height="20" rx="4" fill="#fff"/><path d="M6 2a2 2 0 0 0-2 2v1h12V4a2 2 0 0 0-2-2H6zm10 5H4v9a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7zm-2 3H6v2h8v-2z" fill="#0078D4"/></svg>
              Microsoft Outlook {microsoftConnected && <span className="ml-2 text-green-600">✓ Connected</span>}
            </div>
            <div className="text-xs text-gray-500">
              {microsoftConnected ? "Connected" : "Use your Microsoft account"}
            </div>
            {microsoftConnected && <button className="mt-2 text-xs text-blue-600 underline" onClick={() => setShowDisconnectModal(true)}>Manage</button>}
          </button>
          <button
            type="button"
            className={`rounded-xl border px-4 py-3 bg-white text-left ${icalConnections.length > 0 ? "border-green-500" : "hover:bg-gray-50"}`}
            onClick={icalConnections.length > 0 ? () => router.push("/onboarding/schedule/apple") : () => router.push("/onboarding/schedule/apple")}
            disabled={!!err || loading}
            title={icalConnections.length > 0 ? "Already connected" : err ? "Fix the error above first" : ""}
          >
            <div className="font-medium flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#A2AAAD]" viewBox="0 0 20 20" fill="currentColor"><rect width="20" height="20" rx="4" fill="#fff"/><path d="M6 2a2 2 0 0 0-2 2v1h12V4a2 2 0 0 0-2-2H6zm10 5H4v9a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7zm-2 3H6v2h8v-2z" fill="#A2AAAD"/></svg>
              Apple Calendar {icalConnections.length > 0 && <span className="ml-2 text-green-600">✓ Connected</span>}
            </div>
            <div className="text-xs text-gray-500">
              (iCloud Calendar)<br />{icalConnections.length > 0 ? `${icalConnections.length} connected` : "Use an iCal/webcal URL"}
            </div>
            {icalConnections.length > 0 && <button className="mt-2 text-xs text-blue-600 underline" onClick={() => router.push("/onboarding/schedule/apple")}>Manage</button>}
          </button>
        </div>
      </section>

      {/* Availability */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold">Set your availability</h2>
        <p className="text-sm text-gray-600">
          After connecting a calendar, choose which hours actors can book. We’ll block off times that
          conflict with events on your connected calendar.
        </p>
      </section>

      {/* Footer actions */}
      <div className="mt-12 flex flex-col gap-3">
        {!googleConnected && !microsoftConnected && icalConnections.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>⚠️ Calendar sync required:</strong> Please connect your Google Calendar, Microsoft Outlook, or Apple Calendar above before continuing. This ensures actors can see your real-time availability and prevents double-bookings.
            </p>
          </div>
        )}
        
        <div className="flex gap-3">
          <button
            type="button"
            className="rounded-lg border px-4 py-2"
            onClick={() => router.push("/")}
          >
            Back to Home
          </button>
          <button
            type="button"
            className={`rounded-lg px-4 py-2 ${
              (googleConnected || microsoftConnected || icalConnections.length > 0)
                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
            onClick={async () => {
              if (googleConnected || microsoftConnected || icalConnections.length > 0) {
                // Update onboarding step before continuing
                setUpdatingStep(true);
                try {
                  const id = effectiveReaderId || readerId;
                  await fetch('/api/readers/update-step', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ readerId: id, step: 'availability' }),
                  });
                } catch (err) {
                  console.error('Failed to update onboarding step:', err);
                }
                setUpdatingStep(false);
                const id = effectiveReaderId || readerId;
                router.push(`/onboarding/availability?readerId=${id}`);
              }
            }}
            disabled={!googleConnected && !microsoftConnected && icalConnections.length === 0 || updatingStep}
            title={(!googleConnected && !microsoftConnected && icalConnections.length === 0) ? "Please connect your calendar first" : ""}
          >
            {updatingStep ? "Saving..." : checkingConnection ? "Checking..." : "Continue"}
          </button>
          <button
            type="button"
            className="rounded-lg px-4 py-2 bg-gray-200 text-gray-700 hover:bg-gray-300"
            onClick={async () => {
              // Skip this step and go to next
              await fetch('/api/onboarding/skip-step', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ step: 'calendar-connected' }),
              });
              const id = effectiveReaderId || readerId;
              router.push(`/onboarding/availability?readerId=${id}`);
            }}
          >
            Skip for now
          </button>
        </div>
      </div>
    </main>
  );
}
