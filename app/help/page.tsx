import Link from 'next/link';

export default function HelpPage() {
  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Help & Support</h1>
      <div className="space-y-6">
        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Contact Support</h2>
          <p className="text-gray-600 mb-4">Need help? Our support team is here for you.</p>
          <a href="mailto:support@selftape-reader.com" className="inline-block bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700">Email Support</a>
        </div>
        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Frequently Asked Questions</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">How do I book a reader?</h3>
              <p className="text-sm text-gray-600">Browse available readers, select a time slot that works for you, and complete the payment.</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">How do I become a reader?</h3>
              <p className="text-sm text-gray-600">Click Upgrade to Reader on your dashboard. Complete your profile, set rates, and subscribe for $9.99/month.</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">How do payments work?</h3>
              <p className="text-sm text-gray-600">Actors pay upfront. Readers receive 80% of session fees. Payments processed through Stripe.</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Can I cancel or reschedule a session?</h3>
              <p className="text-sm text-gray-600 mb-2">Yes! Use the cancel/reschedule links in your confirmation email or visit your bookings page.</p>
              <ul className="text-sm text-gray-600 ml-4 list-disc space-y-1">
                <li><strong>Actors:</strong> Cancel/reschedule up to 2 hours before for full refund (minus ~$2 fee)</li>
                <li><strong>Readers:</strong> Must cancel 24+ hours before to avoid penalties</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">What is the cancellation policy?</h3>
              <div className="text-sm text-gray-600 space-y-2">
                <p><strong>For Actors:</strong></p>
                <ul className="ml-4 list-disc space-y-1">
                  <li>2+ hours notice: Full refund minus processing fee (~$2)</li>
                  <li>Under 2 hours: No refund, reader gets paid</li>
                  <li>No-show: No refund</li>
                </ul>
                <p><strong>For Readers:</strong></p>
                <ul className="ml-4 list-disc space-y-1">
                  <li>24+ hours notice: No penalty, actor gets full refund</li>
                  <li>Under 24 hours: Warning issued, actor gets refund</li>
                  <li>No-show: 14-day suspension + actor gets refund + $5 credit</li>
                  <li>Late 5+ min: Session auto-extends</li>
                </ul>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-2">What if there's a technical issue during my session?</h3>
              <div className="text-sm text-gray-600 space-y-1">
                <ul className="ml-4 list-disc">
                  <li><strong>Platform failure:</strong> Full refund or free reschedule</li>
                  <li><strong>Actor's internet:</strong> No refund (actor's responsibility)</li>
                  <li><strong>Reader's internet:</strong> Partial/full refund based on severity</li>
                </ul>
                <p className="mt-2">Report issues immediately using the link in your confirmation email.</p>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-2">How do I report a no-show or other issue?</h3>
              <p className="text-sm text-gray-600">Use the "Report Issue" link in your confirmation email or visit your booking details page. Our support team reviews all reports within 24 hours.</p>
            </div>
          </div>
        </div>
        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Resources</h2>
          <ul className="space-y-2 text-sm">
            <li><Link href="/about" className="text-emerald-600 hover:text-emerald-700">About Us</Link></li>
            <li><Link href="/pricing" className="text-emerald-600 hover:text-emerald-700">Pricing</Link></li>
            <li><Link href="/terms" className="text-emerald-600 hover:text-emerald-700">Terms of Service</Link></li>
          </ul>
        </div>
      </div>
      <div className="mt-8">
        <Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">← Back to Dashboard</Link>
      </div>
    </div>
  );
}
