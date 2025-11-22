export const metadata = {
  title: "Privacy Policy | Self Tape Reader",
  description: "Privacy Policy for Self Tape Reader - How we collect, use, and protect your data",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm p-8 md:p-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
          <p className="text-sm text-gray-600 mb-8">Last Updated: November 22, 2024</p>

          <div className="prose prose-gray max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Introduction</h2>
              <p className="text-gray-700 mb-4">
                Welcome to Self Tape Reader ("we," "our," or "us"). We are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform at selftape-reader.com (the "Service").
              </p>
              <p className="text-gray-700">
                By using our Service, you agree to the collection and use of information in accordance with this Privacy Policy. If you do not agree with our policies and practices, please do not use our Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Information We Collect</h2>
              
              <h3 className="text-xl font-semibold text-gray-800 mb-3">2.1 Personal Information</h3>
              <p className="text-gray-700 mb-4">
                When you register for an account, we collect:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li><strong>Account Information:</strong> Name, email address, password (encrypted)</li>
                <li><strong>Profile Information:</strong> Display name, phone number, timezone, city, bio, headshot photo</li>
                <li><strong>Professional Information:</strong> For readers - playable age range, gender, unions, languages, specialties, professional links, pricing rates</li>
                <li><strong>Payment Information:</strong> Processed securely through Stripe (we do not store credit card details)</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">2.2 Calendar Information</h3>
              <p className="text-gray-700 mb-4">
                If you connect your calendar (Google Calendar, Microsoft Outlook, or iCal), we access:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>Event start and end times</li>
                <li>Event busy/free status</li>
                <li>Event titles (for conflict detection only)</li>
              </ul>
              <p className="text-gray-700 mb-4">
                <strong>Important:</strong> We only read your calendar to determine availability. We never modify, delete, or create calendar events. We do not store the contents of your calendar events.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">2.3 Booking Information</h3>
              <p className="text-gray-700 mb-4">
                When you book or provide sessions, we collect:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>Session date, time, and duration</li>
                <li>Audition sides (uploaded files or links)</li>
                <li>Session notes</li>
                <li>Video meeting URLs</li>
                <li>Payment and transaction details</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">2.4 Automatically Collected Information</h3>
              <p className="text-gray-700 mb-4">
                When you use our Service, we automatically collect:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li><strong>Usage Data:</strong> Pages visited, features used, time spent on the Service</li>
                <li><strong>Device Information:</strong> Browser type, operating system, IP address</li>
                <li><strong>Cookies:</strong> Session cookies for authentication and user preferences</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">3. How We Use Your Information</h2>
              <p className="text-gray-700 mb-4">
                We use the information we collect to:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li><strong>Provide the Service:</strong> Create and manage your account, facilitate bookings, process payments</li>
                <li><strong>Manage Availability:</strong> Check calendar conflicts to show accurate availability</li>
                <li><strong>Communications:</strong> Send booking confirmations, session reminders, and important account updates</li>
                <li><strong>Improve the Service:</strong> Analyze usage patterns to enhance features and user experience</li>
                <li><strong>Security:</strong> Detect and prevent fraud, abuse, and security incidents</li>
                <li><strong>Compliance:</strong> Comply with legal obligations and enforce our Terms of Service</li>
                <li><strong>Marketing:</strong> Send promotional emails (only if you opt-in; you can unsubscribe anytime)</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">4. How We Share Your Information</h2>
              <p className="text-gray-700 mb-4">
                We do not sell your personal information. We share your information only in the following circumstances:
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">4.1 Between Users</h3>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>Readers' public profiles (name, photo, bio, rates) are visible to actors browsing the marketplace</li>
                <li>When a booking is made, actors and readers can see each other's names and email addresses</li>
                <li>Uploaded audition sides are shared with the reader for the booked session</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">4.2 Service Providers</h3>
              <p className="text-gray-700 mb-4">
                We share information with trusted third-party service providers who help us operate the Service:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li><strong>Stripe:</strong> Payment processing (subject to Stripe's privacy policy)</li>
                <li><strong>Daily.co:</strong> Video conferencing for sessions</li>
                <li><strong>Vercel:</strong> Hosting and infrastructure</li>
                <li><strong>Resend:</strong> Transactional email delivery</li>
              </ul>
              <p className="text-gray-700 mb-4">
                These service providers are contractually obligated to protect your information and use it only for the purposes we specify.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">4.3 Legal Requirements</h3>
              <p className="text-gray-700 mb-4">
                We may disclose your information if required by law or in response to valid legal requests (subpoenas, court orders, government requests).
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">4.4 Business Transfers</h3>
              <p className="text-gray-700 mb-4">
                If Self Tape Reader is acquired by or merged with another company, your information may be transferred to the new owner.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Calendar Data Privacy</h2>
              <p className="text-gray-700 mb-4">
                We take your calendar privacy seriously:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li><strong>Read-Only Access:</strong> We only read your calendar to check for conflicts. We never write to or modify your calendar.</li>
                <li><strong>Limited Data:</strong> We only look at event times and busy/free status, not detailed event contents.</li>
                <li><strong>Temporary Caching:</strong> Calendar data is cached for 5 minutes to improve performance, then discarded.</li>
                <li><strong>No Long-Term Storage:</strong> We do not permanently store your calendar events.</li>
                <li><strong>Disconnect Anytime:</strong> You can disconnect your calendar at any time from your account settings.</li>
              </ul>
              <p className="text-gray-700 mb-4">
                <strong>Google API Services User Data Policy:</strong> Self Tape Reader's use of information received from Google APIs adheres to the <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:text-emerald-700 underline">Google API Services User Data Policy</a>, including the Limited Use requirements.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Data Security</h2>
              <p className="text-gray-700 mb-4">
                We implement industry-standard security measures to protect your information:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li><strong>Encryption:</strong> All data is transmitted over HTTPS (SSL/TLS encryption)</li>
                <li><strong>Password Protection:</strong> Passwords are hashed and salted using bcrypt</li>
                <li><strong>Access Controls:</strong> Limited employee access to personal information</li>
                <li><strong>Regular Updates:</strong> We keep our systems updated with security patches</li>
              </ul>
              <p className="text-gray-700">
                However, no method of transmission over the Internet is 100% secure. While we strive to protect your information, we cannot guarantee absolute security.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Your Rights and Choices</h2>
              <p className="text-gray-700 mb-4">
                You have the following rights regarding your personal information:
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">7.1 Access and Portability</h3>
              <p className="text-gray-700 mb-4">
                You can access and download your personal information from your account settings.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">7.2 Correction</h3>
              <p className="text-gray-700 mb-4">
                You can update your profile information at any time through your account settings.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">7.3 Deletion</h3>
              <p className="text-gray-700 mb-4">
                You can request deletion of your account by contacting us at privacy@selftape-reader.com. We will delete your information within 30 days, except where we are required to retain it for legal purposes.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">7.4 Marketing Opt-Out</h3>
              <p className="text-gray-700 mb-4">
                You can unsubscribe from marketing emails by clicking the "unsubscribe" link in any promotional email or updating your preferences in account settings.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">7.5 Calendar Disconnect</h3>
              <p className="text-gray-700 mb-4">
                You can disconnect your calendar integration at any time from your account settings. This will immediately stop us from accessing your calendar.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">7.6 Do Not Track</h3>
              <p className="text-gray-700 mb-4">
                We do not currently respond to "Do Not Track" browser signals, but we do not track users across third-party websites.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Children's Privacy</h2>
              <p className="text-gray-700">
                Our Service is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us, and we will delete such information.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">9. International Users</h2>
              <p className="text-gray-700">
                Our Service is hosted in the United States. If you access the Service from outside the United States, your information will be transferred to, stored, and processed in the United States. By using the Service, you consent to this transfer.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Changes to This Privacy Policy</h2>
              <p className="text-gray-700">
                We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new Privacy Policy on this page and updating the "Last Updated" date. We encourage you to review this Privacy Policy periodically.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Contact Us</h2>
              <p className="text-gray-700 mb-4">
                If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:
              </p>
              <div className="bg-gray-50 p-6 rounded-lg">
                <p className="text-gray-700 mb-2"><strong>Email:</strong> privacy@selftape-reader.com</p>
                <p className="text-gray-700 mb-2"><strong>Website:</strong> https://selftape-reader.com</p>
                <p className="text-gray-700"><strong>Response Time:</strong> We aim to respond to all inquiries within 48 hours.</p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">12. State-Specific Rights</h2>
              
              <h3 className="text-xl font-semibold text-gray-800 mb-3">12.1 California Residents (CCPA)</h3>
              <p className="text-gray-700 mb-4">
                If you are a California resident, you have additional rights under the California Consumer Privacy Act (CCPA):
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>Right to know what personal information we collect, use, and disclose</li>
                <li>Right to request deletion of your personal information</li>
                <li>Right to opt-out of the sale of personal information (note: we do not sell personal information)</li>
                <li>Right to non-discrimination for exercising your CCPA rights</li>
              </ul>
              <p className="text-gray-700 mb-4">
                To exercise these rights, contact us at privacy@selftape-reader.com.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">12.2 European Union Residents (GDPR)</h3>
              <p className="text-gray-700 mb-4">
                If you are in the European Union, you have rights under the General Data Protection Regulation (GDPR):
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>Right of access to your personal data</li>
                <li>Right to rectification of inaccurate data</li>
                <li>Right to erasure ("right to be forgotten")</li>
                <li>Right to restrict processing</li>
                <li>Right to data portability</li>
                <li>Right to object to processing</li>
                <li>Right to withdraw consent</li>
              </ul>
              <p className="text-gray-700">
                To exercise these rights, contact us at privacy@selftape-reader.com.
              </p>
            </section>

            <div className="mt-12 pt-8 border-t border-gray-200">
              <p className="text-sm text-gray-600 text-center">
                Thank you for trusting Self Tape Reader with your information. We are committed to protecting your privacy and providing a secure platform for actors and readers to connect.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}