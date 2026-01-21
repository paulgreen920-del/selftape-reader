// app/become-a-reader/page.tsx
"use client";
import Link from "next/link";

export default function BecomeAReaderPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
      {/* Hero Section */}
      <section className="max-w-4xl mx-auto px-6 py-16 text-center">
        <div className="inline-block bg-emerald-100 text-emerald-700 px-4 py-2 rounded-full text-sm font-semibold mb-6">
          🎭 For Actors Who Want to Earn
        </div>
        
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight mb-6">
          Get Paid to Read
          <br />
          <span className="text-emerald-600">Self-Tape Lines</span>
        </h1>
        
        <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
          Help fellow actors nail their auditions. Set your own rates, set your own schedule, work from anywhere.
        </p>

        {/* Main CTA */}
        <Link
          href="/"
          className="inline-block px-10 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xl rounded-xl transition shadow-lg hover:shadow-xl mb-4"
        >
          Start Earning Today →
        </Link>
        
        <p className="text-gray-500">
          No membership fees. No credit card required.
        </p>
      </section>

      {/* Value Prop */}
      <section className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-gray-900 text-white rounded-3xl p-8 sm:p-12 text-center">
          <h2 className="text-5xl sm:text-6xl font-bold text-emerald-400 mb-2">Keep 80%</h2>
          <p className="text-xl text-gray-300 mb-6">of every booking you complete</p>
          
          <div className="grid sm:grid-cols-3 gap-6 text-left">
            <div className="bg-gray-800 rounded-xl p-6">
              <div className="text-3xl mb-3">💰</div>
              <h3 className="font-semibold text-lg mb-2">Set Your Rates</h3>
              <p className="text-gray-400 text-sm">Charge what you're worth. Most readers earn $15-60 per session.</p>
            </div>
            <div className="bg-gray-800 rounded-xl p-6">
              <div className="text-3xl mb-3">📅</div>
              <h3 className="font-semibold text-lg mb-2">Your Schedule</h3>
              <p className="text-gray-400 text-sm">Mark your available hours. Actors book directly — no back-and-forth.</p>
            </div>
            <div className="bg-gray-800 rounded-xl p-6">
              <div className="text-3xl mb-3">🏠</div>
              <h3 className="font-semibold text-lg mb-2">Work From Home</h3>
              <p className="text-gray-400 text-sm">All sessions happen over video. Read lines from your couch.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-4xl mx-auto px-6 py-12">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-10">
          How It Works
        </h2>
        
        <div className="space-y-6">
          {[
            {
              step: "1",
              title: "Create Your Profile",
              desc: "Set your rates, availability, and tell actors about your experience. Takes about 5 minutes."
            },
            {
              step: "2",
              title: "Connect Your Calendar",
              desc: "Sync with Google or Outlook. Actors only see times you're actually free."
            },
            {
              step: "3",
              title: "Get Booked",
              desc: "Actors find you in our marketplace and book sessions directly. You get notified instantly."
            },
            {
              step: "4",
              title: "Read & Get Paid",
              desc: "Join the video call, deliver the lines, help them nail the audition. Payment hits your account automatically."
            }
          ].map((item) => (
            <div key={item.step} className="flex gap-4 items-start">
              <div className="w-10 h-10 bg-emerald-600 text-white rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0">
                {item.step}
              </div>
              <div>
                <h3 className="font-semibold text-lg text-gray-900">{item.title}</h3>
                <p className="text-gray-600">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Earnings Calculator */}
      <section className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-emerald-50 border-2 border-emerald-200 rounded-3xl p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            What Could You Earn?
          </h2>
          
          <div className="grid sm:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <p className="text-gray-600 mb-2">2 sessions/week</p>
              <p className="text-3xl font-bold text-emerald-600">$120-240</p>
              <p className="text-gray-500 text-sm">/month</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border-2 border-emerald-400">
              <p className="text-gray-600 mb-2">5 sessions/week</p>
              <p className="text-3xl font-bold text-emerald-600">$300-600</p>
              <p className="text-gray-500 text-sm">/month</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <p className="text-gray-600 mb-2">10 sessions/week</p>
              <p className="text-3xl font-bold text-emerald-600">$600-1200</p>
              <p className="text-gray-500 text-sm">/month</p>
            </div>
          </div>
          
          <p className="text-gray-500 text-sm mt-6">
            Based on average session rates of $15-30. You keep 80% of every booking.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-4xl mx-auto px-6 py-12">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-10">
          Common Questions
        </h2>
        
        <div className="space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="font-semibold text-lg text-gray-900 mb-2">Do I need acting experience?</h3>
            <p className="text-gray-600">It helps, but it's not required. If you can read lines with emotion and timing, you can be a reader. Many successful readers are drama students, voice actors, or just people who love acting.</p>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="font-semibold text-lg text-gray-900 mb-2">Is it really free to join?</h3>
            <p className="text-gray-600">Yes. No membership fees, no hidden costs. We only make money when you make money — we take a 20% platform fee from each booking. You keep 80%.</p>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="font-semibold text-lg text-gray-900 mb-2">What equipment do I need?</h3>
            <p className="text-gray-600">Just a computer with a webcam and decent internet. You don't need professional audio or lighting — actors are recording themselves, not you.</p>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="font-semibold text-lg text-gray-900 mb-2">How do I get paid?</h3>
            <p className="text-gray-600">Payments go directly to your bank account via Stripe. You can cash out anytime — no minimum balance required.</p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-3xl p-12 text-center text-white">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Ready to Start Earning?
          </h2>
          <p className="text-xl text-emerald-100 mb-8 max-w-xl mx-auto">
            Join as a Founding Member. Your account stays free forever — even if we introduce membership fees later.
          </p>
          
          <Link
            href="/"
            className="inline-block px-10 py-4 bg-white text-emerald-600 font-semibold text-xl rounded-xl transition shadow-lg hover:shadow-xl hover:bg-gray-50"
          >
            Get Started →
          </Link>
          
          <p className="mt-4 text-emerald-200 text-sm">
            Takes about 5 minutes. No credit card required.
          </p>
        </div>
      </section>

      {/* Footer note */}
      <footer className="max-w-4xl mx-auto px-6 py-8 text-center text-gray-500 text-sm">
        <p>
          Founding members who join during our launch period will never pay membership fees.
          <br />
          Questions? Email us at help@selftapereader.com
        </p>
      </footer>
    </main>
  );
}