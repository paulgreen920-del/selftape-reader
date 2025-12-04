import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function AppleCalendarPage() {
  const router = useRouter();
  const params = useSearchParams();
  const fromDashboard = params.get("from") === "dashboard";

  // Simulated connected calendars (replace with real API call)
  const [calendars, setCalendars] = useState<Array<{ name: string; url: string }>>([]);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const maxCalendars = 5;

  const handleConnect = () => {
    if (name && url && calendars.length < maxCalendars) {
      setCalendars([...calendars, { name, url }]);
      setName("");
      setUrl("");
    }
  };

  const handleRemove = (idx: number) => {
    setCalendars(calendars.filter((_, i) => i !== idx));
  };

  const handleContinue = () => {
    if (calendars.length > 0) {
      if (fromDashboard) {
        router.push("/reader/availability");
      } else {
        router.push("/onboarding/availability");
      }
    }
  };

  const handleBack = () => {
    if (fromDashboard) {
      router.push("/reader/availability");
    } else {
      router.push("/onboarding/schedule");
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center">
      <div className="w-full max-w-xl mx-auto px-4 py-8">
        <Link href="/onboarding/schedule" className="text-sm text-gray-600 mb-4 inline-block">← Connect a different calendar</Link>
        <h1 className="text-3xl font-bold text-center mb-6">Connect Apple Calendar</h1>
        {/* Warning Banner */}
        <div className="bg-amber-100 text-amber-800 rounded-md px-4 py-3 mb-6 font-medium">
          ⚠️ Apple Calendar links can only be obtained from iCloud.com or a Mac — not directly from your iPhone.
        </div>
        {/* Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Option A */}
          <div className="border rounded-lg p-4 bg-white shadow">
            <div className="flex items-center mb-2">
              <span className="bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded mr-2">Recommended</span>
              <span className="font-semibold">From iCloud.com</span>
            </div>
            <ol className="list-decimal ml-5 text-sm space-y-1">
              <li>Go to iCloud.com in your browser and sign in with your Apple ID</li>
              <li>Click "Calendar"</li>
              <li>In the left sidebar, click the share icon (person with plus sign) next to the calendar you want to connect</li>
              <li>Check "Public Calendar"</li>
              <li>Click "Copy Link"</li>
            </ol>
          </div>
          {/* Option B */}
          <div className="border rounded-lg p-4 bg-white shadow">
            <div className="font-semibold mb-2">From Mac Calendar App</div>
            <ol className="list-decimal ml-5 text-sm space-y-1">
              <li>Open the Calendar app on your Mac</li>
              <li>Right-click the calendar in the left sidebar</li>
              <li>Select "Sharing Settings"</li>
              <li>Check "Public Calendar"</li>
              <li>Click "Copy Link"</li>
            </ol>
          </div>
        </div>
        {/* Input Section */}
        <div className="bg-gray-50 border rounded-lg p-6 mb-8">
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Calendar Name</label>
            <input
              type="text"
              className="w-full border rounded px-3 py-2"
              placeholder="e.g., Work, Personal"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">iCal URL</label>
            <input
              type="text"
              className="w-full border rounded px-3 py-2"
              placeholder="Paste your Apple Calendar link here"
              value={url}
              onChange={e => setUrl(e.target.value)}
            />
          </div>
          <button
            className="w-full bg-emerald-600 text-white py-2 rounded font-semibold disabled:opacity-50"
            onClick={handleConnect}
            disabled={!name || !url || calendars.length >= maxCalendars}
          >
            Connect Calendar
          </button>
        </div>
        {/* Connected Calendars List */}
        {calendars.length > 0 && (
          <div className="mb-8">
            <div className="mb-2 font-semibold">Connected Apple Calendars</div>
            <ul className="space-y-2 mb-2">
              {calendars.map((cal, idx) => (
                <li key={idx} className="flex items-center justify-between bg-white border rounded px-3 py-2">
                  <span>{cal.name}</span>
                  <button
                    className="text-red-500 text-xs px-2 py-1 border border-red-200 rounded hover:bg-red-50"
                    onClick={() => handleRemove(idx)}
                  >Remove</button>
                </li>
              ))}
            </ul>
            {calendars.length < maxCalendars && (
              <button
                className="text-emerald-600 text-sm font-semibold px-2 py-1 border border-emerald-200 rounded hover:bg-emerald-50"
                onClick={() => {}}
                disabled={calendars.length >= maxCalendars}
              >Add Another Calendar</button>
            )}
            <div className="text-xs text-gray-500 mt-2">{calendars.length} of {maxCalendars} calendars connected</div>
          </div>
        )}
        {/* Footer Note */}
        <div className="text-xs text-gray-500 mb-8">
          Note: Apple Calendar is read-only. We'll see your busy times to prevent double-bookings, but new sessions won't automatically appear on your calendar. You'll receive an email with a calendar invite (.ics file) for each booking.
        </div>
        {/* Navigation Buttons */}
        <div className="flex flex-col md:flex-row gap-2 mb-4">
          <button
            className="w-full md:w-1/3 border border-gray-300 text-gray-700 py-2 rounded font-semibold"
            onClick={handleBack}
          >Back</button>
          <button
            className="w-full md:w-1/3 bg-emerald-600 text-white py-2 rounded font-semibold disabled:opacity-50"
            onClick={handleContinue}
            disabled={calendars.length === 0}
          >Continue</button>
          <Link
            href={fromDashboard ? "/reader/availability" : "/onboarding/availability"}
            className="w-full md:w-1/3 text-center text-gray-500 py-2 rounded font-semibold hover:underline"
          >Skip for now</Link>
        </div>
      </div>
    </div>
  );
}
