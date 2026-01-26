import Link from 'next/link';

export const metadata = {
  title: "About Self Tape Reader | Actors Helping Actors",
  description: "Self Tape Reader connects actors who need readers for auditions with actors who want to help. No subscriptions, no hassle — just book and tape.",
  openGraph: {
    title: "About Self Tape Reader",
    description: "Actors helping actors nail their self-tape auditions.",
    url: "https://www.selftapereader.com/about",
  },
};

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="text-4xl font-bold mb-6">About Self Tape Reader</h1>
      
      <div className="prose prose-lg max-w-none space-y-6">
        <p className="text-xl text-gray-600 leading-relaxed">
          Self Tape Reader connects actors who need help with their self-tapes with experienced readers who provide professional, reliable support.
        </p>

        <section className="mt-8">
          <h2 className="text-2xl font-semibold mb-4">Our Mission</h2>
          <p className="text-gray-700">
            We believe every actor deserves access to quality readers for their auditions. Whether you're preparing for a major callback or practicing a new monologue, having the right reader can make all the difference. Self Tape Reader makes it easy to find, book, and connect with talented readers who understand the craft.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-2xl font-semibold mb-4">How It Works</h2>
          
          <div className="grid md:grid-cols-2 gap-6 mt-6">
            <div className="bg-blue-50 rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-3 text-blue-900">For Actors</h3>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">1.</span>
                  <span>Browse our marketplace of experienced readers</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">2.</span>
                  <span>View rates, availability, and specialties</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">3.</span>
                  <span>Book a session that fits your schedule</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">4.</span>
                  <span>Connect via video call and nail your audition</span>
                </li>
              </ul>
            </div>

            <div className="bg-emerald-50 rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-3 text-emerald-900">For Readers</h3>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 mt-1">1.</span>
                  <span>Sign up and create your reader profile</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 mt-1">2.</span>
                  <span>Set your own rates and availability</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 mt-1">3.</span>
                  <span>Accept bookings from actors in need</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 mt-1">4.</span>
                  <span>Earn 80% of session fees helping fellow actors</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-2xl font-semibold mb-4">Why Self Tape Reader?</h2>
          <div className="grid md:grid-cols-3 gap-6 mt-6">
            <div className="text-center">
              <div className="text-4xl mb-3">⚡</div>
              <h3 className="font-semibold mb-2">Fast & Easy</h3>
              <p className="text-sm text-gray-600">Book a reader in minutes, not hours. Our platform makes scheduling simple.</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-3">💰</div>
              <h3 className="font-semibold mb-2">Fair Pricing</h3>
              <p className="text-sm text-gray-600">Transparent rates with no hidden fees. Readers keep 80% of session fees.</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-3">🎭</div>
              <h3 className="font-semibold mb-2">Actor-Focused</h3>
              <p className="text-sm text-gray-600">Built by actors, for actors. We understand the unique needs of self-taping.</p>
            </div>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-2xl font-semibold mb-4">Pricing</h2>
          <div className="bg-gray-50 rounded-lg p-6">
            <p className="text-gray-700 mb-4">
              <strong>For Actors:</strong> Free to sign up and browse. Pay only for the sessions you book at rates set by individual readers (typically $15-60 per session).
            </p>
            <p className="text-gray-700">
              <strong>For Readers:</strong> $9.99/month subscription to maintain an active profile in our marketplace. Keep 80% of all session fees you earn.
            </p>
          </div>
        </section>

        <section className="mt-8 bg-emerald-50 border border-emerald-200 rounded-lg p-8 text-center">
          <h2 className="text-2xl font-semibold mb-4">Ready to Get Started?</h2>
          <p className="text-gray-700 mb-6">
            Join our community of actors helping actors succeed.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/signup"
              className="inline-block bg-emerald-600 text-white px-8 py-3 rounded-lg hover:bg-emerald-700 font-semibold"
            >
              Sign Up as Actor
            </Link>
            <Link
              href="/signup?role=READER"
              className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 font-semibold"
            >
              Become a Reader
            </Link>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-2xl font-semibold mb-4">Questions?</h2>
          <p className="text-gray-700">
            Check out our <Link href="/help" className="text-emerald-600 hover:underline">Help & Support</Link> page or contact us at{' '}
                <a href="mailto:support@selftapereader.com" className="text-emerald-600 hover:underline">
                  support@selftapereader.com
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
