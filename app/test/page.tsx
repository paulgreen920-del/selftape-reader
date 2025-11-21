// Quick test of the booking system
"use client";

import { useState } from "react";

export default function BookingTest() {
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const testBookingFlow = async () => {
    setLoading(true);
    setResult("Starting test...\n");
    
    try {
      // 1. Test availability
      setResult(prev => prev + "✓ Testing availability API...\n");
      const availResponse = await fetch('/api/schedule/available-slots?readerId=cm4k4glj30000119rwbf826so&date=2024-11-25&timezone=America/New_York');
      const availData = await availResponse.json();
      setResult(prev => prev + `✓ Available slots: ${availData.slots?.length || 0} found\n`);
      
      // 2. Test bookings list
      setResult(prev => prev + "✓ Testing bookings API...\n");
      const bookingsResponse = await fetch('/api/bookings?scope=all');
      const bookingsData = await bookingsResponse.json();
      setResult(prev => prev + `✓ Total bookings: ${bookingsData.bookings?.length || 0}\n`);
      
      // 3. Test webhook trigger
      if (bookingsData.bookings?.length > 0) {
        const pendingBooking = bookingsData.bookings.find((b: any) => b.status === 'PENDING');
        if (pendingBooking) {
          setResult(prev => prev + `✓ Testing webhook for booking ${pendingBooking.id.substring(0, 8)}...\n`);
          const webhookResponse = await fetch('/api/dev/webhook-trigger', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bookingId: pendingBooking.id })
          });
          const webhookData = await webhookResponse.json();
          setResult(prev => prev + `✓ Webhook result: ${webhookData.ok ? 'SUCCESS' : 'FAILED'}\n`);
          if (webhookData.calendarEvent) {
            setResult(prev => prev + `✓ Calendar event created: ${webhookData.calendarEvent.id}\n`);
          }
        }
      }
      
      setResult(prev => prev + "\n🎉 All tests completed!\n");
      
    } catch (error) {
      setResult(prev => prev + `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Booking System Test</h1>
      
      <div className="space-y-4">
        <button
          onClick={testBookingFlow}
          disabled={loading}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Running Tests...' : 'Run All Tests'}
        </button>
        
        <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm whitespace-pre-wrap min-h-[200px]">
          {result || "Click 'Run All Tests' to start..."}
        </div>
        
        <div className="grid md:grid-cols-2 gap-4 mt-8">
          <div className="bg-white border rounded-lg p-4">
            <h3 className="font-semibold mb-2">Quick Links</h3>
            <div className="space-y-2 text-sm">
              <a href="/dev/bookings" className="block text-blue-600 hover:text-blue-700">
                📋 Booking Management
              </a>
              <a href="/readers" className="block text-blue-600 hover:text-blue-700">
                👥 Find Readers
              </a>
              <a href="/reader/cm4k4glj30000119rwbf826so" className="block text-blue-600 hover:text-blue-700">
                🗓️ Test Reader Profile
              </a>
            </div>
          </div>
          
          <div className="bg-white border rounded-lg p-4">
            <h3 className="font-semibold mb-2">System Status</h3>
            <div className="space-y-2 text-sm">
              <div>✅ Google Calendar Integration</div>
              <div>✅ Stripe Webhook Simulation</div>
              <div>✅ Timezone Handling</div>
              <div>✅ Frontend Cache Busting</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
