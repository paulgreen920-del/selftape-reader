"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

export default function AppleCalendarPage() {
  const router = useRouter();
  const params = useSearchParams();
  const fromDashboard = params.get("from") === "dashboard";

  // Connected calendars from API
  const [calendars, setCalendars] = useState<Array<{ id: string; name: string; url: string }>>([]);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const maxCalendars = 5;
  const [showForm, setShowForm] = useState(calendars.length === 0);
  const [showSuccess, setShowSuccess] = useState(false);

  // Fetch existing calendars on mount
  useEffect(() => {
    fetch('/api/calendar/ical')
      .then(res => res.json())
      .then(data => {
        if (data.ok && data.connections) {
          setCalendars(data.connections);
          setShowForm(data.connections.length === 0);
        }
      });
  }, []);

  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(() => setShowSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showSuccess]);

  const handleConnect = async () => {
    if (name && url && calendars.length < maxCalendars) {
      const res = await fetch('/api/calendar/ical', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, url }),
      });
      const data = await res.json();
      if (data.ok && data.connection) {
        setCalendars([...calendars, data.connection]);
        setName("");
        setUrl("");
        setShowForm(false);
        setShowSuccess(true);
      } else {
        alert(data.error || 'Failed to connect calendar');
      }
    }
  };

  const handleRemove = async (id: string) => {
    const res = await fetch(`/api/calendar/ical/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.ok) {
      const newCals = calendars.filter(c => c.id !== id);
      setCalendars(newCals);
      if (newCals.length === 0) {
        setShowForm(true);
      }
    } else {
      alert(data.error || 'Failed to remove calendar');
    }
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

  const handleAddAnother = () => {
    setShowForm(true);
    setName("");
    setUrl("");
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
         {showForm && calendars.length < maxCalendars && (
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
         )}
         {/* Success Message */}
         {showSuccess && (
           <div className="flex items-center justify-center mb-8">
             <span className="text-green-600 mr-2">
               <svg width="24" height="24" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#22c55e"/><path d="M7 13l3 3 7-7" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
             </span>
             <span className="text-green-700 font-semibold">Calendar connected successfully!</span>
           </div>
         )}
        {/* Connected Calendars List */}
         {calendars.length > 0 && (
           <div className="mb-8">
             <div className="mb-2 font-semibold">Connected Apple Calendars</div>
             <ul className="space-y-2 mb-2">
               {calendars.map((cal) => (
                 <li key={cal.id} className="flex items-center justify-between bg-white border rounded px-3 py-2">
                   <span>{cal.name}</span>
                   <button
                     className="text-red-500 text-xs px-2 py-1 border border-red-200 rounded hover:bg-red-50"
                     onClick={() => handleRemove(cal.id)}
                   >Remove</button>
                 </li>
               ))}
             </ul>
             {/* Show Add Another Calendar only when form is hidden and less than max */}
             {!showForm && calendars.length < maxCalendars && (
               <button
                 className="text-emerald-600 text-sm font-semibold px-2 py-1 border border-emerald-200 rounded hover:bg-emerald-50"
                 onClick={handleAddAnother}
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
