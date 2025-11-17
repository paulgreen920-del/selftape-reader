// Development availability management
"use client";

import { useState } from "react";

export default function AvailabilityManager() {
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const generateAvailability = async (readerId: string, daysAhead: number = 30, regenerate: boolean = false) => {
    setLoading(true);
    setResult(`Generating ${daysAhead} days of availability${regenerate ? ' (regenerating existing)' : ''}...\n`);

    try {
      const response = await fetch('/api/dev/generate-availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ readerId, daysAhead, regenerate })
      });

      const data = await response.json();

      if (data.ok) {
        setResult(prev => prev + `✅ Success!\n` +
          `- Days processed: ${data.daysProcessed}\n` +
          `- Slots created: ${data.slotsCreated}\n` +
          `- Slots deleted: ${data.slotsDeleted}\n`);
      } else {
        setResult(prev => prev + `❌ Error: ${data.error}\n`);
      }
    } catch (error) {
      setResult(prev => prev + `❌ Network error: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
    } finally {
      setLoading(false);
    }
  };

  const paulGreenId = "cmhx8dvgh000uvqfsiccfq8qo";

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Availability Management</h1>
      
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <h2 className="font-semibold text-yellow-800 mb-2">⚠️ Development Tools</h2>
        <p className="text-yellow-700 text-sm">
          Use these tools to generate availability slots for readers. This creates 30-minute slots 
          from 9 AM to 5 PM ET, Monday through Friday.
        </p>
      </div>

      <div className="space-y-6">
        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Paul Green Availability</h2>
          <p className="text-gray-600 mb-4">Reader ID: {paulGreenId}</p>
          
          <div className="grid md:grid-cols-3 gap-4">
            <button
              onClick={() => generateAvailability(paulGreenId, 15, false)}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              Generate 15 Days
            </button>
            
            <button
              onClick={() => generateAvailability(paulGreenId, 30, false)}
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              Generate 30 Days
            </button>
            
            <button
              onClick={() => generateAvailability(paulGreenId, 15, true)}
              disabled={loading}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
            >
              Regenerate 15 Days
            </button>
          </div>
        </div>

        <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm whitespace-pre-wrap min-h-[200px]">
          {result || "Click a button to generate availability slots..."}
        </div>

        <div className="bg-white border rounded-lg p-4">
          <h3 className="font-semibold mb-3">How It Works</h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
            <li>Creates 30-minute booking slots from 9:00 AM to 4:30 PM Eastern Time</li>
            <li>Only generates slots for weekdays (Monday-Friday)</li>
            <li>Skips dates that already have availability (unless regenerating)</li>
            <li>Handles timezone conversion automatically (EST/EDT to UTC)</li>
            <li>All slots are initially available for booking</li>
          </ul>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white border rounded-lg p-4">
            <h3 className="font-semibold mb-2">Quick Links</h3>
            <div className="space-y-2 text-sm">
              <a href="/reader/cmhx8dvgh000uvqfsiccfq8qo" className="block text-blue-600 hover:text-blue-700">
                📅 View Paul's Calendar
              </a>
              <a href="/dev/bookings" className="block text-blue-600 hover:text-blue-700">
                📋 Booking Management
              </a>
              <a href="/test" className="block text-blue-600 hover:text-blue-700">
                🧪 System Tests
              </a>
            </div>
          </div>
          
          <div className="bg-white border rounded-lg p-4">
            <h3 className="font-semibold mb-2">Troubleshooting</h3>
            <div className="space-y-1 text-sm text-gray-700">
              <div>❓ Days not showing? → Generate availability</div>
              <div>❓ Wrong timezone? → Use regenerate option</div>
              <div>❓ Calendar conflicts? → Check Google Calendar</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}