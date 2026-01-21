// app/for-actors/page.tsx
"use client";
import Link from "next/link";

export default function ForActorsPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-red-50 to-white">
      {/* Hero Section */}
      <section className="max-w-4xl mx-auto px-6 py-16 text-center">
        <div className="inline-block bg-red-100 text-red-700 px-4 py-2 rounded-full text-sm font-semibold mb-6">
          🚫 No AI Voices • No Pre-Recorded Audio • No Editing Nightmares
        </div>
        
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight mb-6">
          Book a Real Human
          <br />
          <span className="text-emerald-600">For Your Self-Tape</span>
        </h1>
        
        <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
          Stop recording your own off-camera lines. Book a real person to read opposite you while you record. Natural timing. Authentic reactions.
        </p>

        {/* Main CTA */}
        <Link
          href="/"
          className="inline-block px-10 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xl rounded-xl transition shadow-lg hover:shadow-xl mb-4"
        >
          Get Started →
        </Link>
        
        <p className="text-gray-500">
          Sessions from $15. No subscription required.
        </p>
      </section>

      {/* The Problem */}
      <section className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-gray-900 text-white rounded-3xl p-8 sm:p-12">
          <h2 className="text-2xl font-bold text-center mb-8">
            Tired of These Self-Tape Struggles?
          </h2>
          
          <div className="grid sm:grid-cols-3 gap-6">
            <div className="bg-gray-800 rounded-xl p-6 text-center">
              <div className="text-4xl mb-3">🤖</div>
              <h3 className="font-semibold text-lg mb-2">AI Voices Sound Fake</h3>
              <p className="text-gray-400 text-sm">Robotic timing ruins your performance. No emotional connection to react to.</p>
            </div>
            <div className="bg-gray-800 rounded-xl p-6 text-center">
              <div className="text-4xl mb-3">🎙️</div>
              <h3 className="font-semibold text-lg mb-2">Recording Your Own Lines</h3>
              <p className="text-gray-400 text-sm">Awkward pauses, unnatural pacing, hours of audio syncing in post.</p>
            </div>
            <div className="bg-gray-800 rounded-xl p-6 text-center">
              <div className="text-4xl mb-3">😬</div>
              <h3 className="font-semibold text-lg mb-2">Begging Friends to Help</h3>
              <p className="text-gray-400 text-sm">They're unavailable, they mumble, they don't understand acting.</p>
            </div>
          </div>
        </div>
      </section>

      {/* The Solution */}
      <section className="max-w-4xl mx-auto px-6 py-12">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">
          The Solution: Real Human Readers
        </h2>
        <p className="text-xl text-gray-600 text-center mb-10 max-w-2xl mx-auto">
          Book an experienced reader who joins your video call and speaks the other character's lines LIVE while you perform and record.
        </p>
        
        <div className="grid sm:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl shadow-lg p-6 text-center border-2 border-emerald-200">
            <div className="text-4xl mb-4">🎭</div>
            <h3 className="font-semibold text-lg text-emerald-700 mb-2">Real Scene Partner</h3>
            <p className="text-gray-600 text-sm">A human who understands timing and gives you something real to react to.</p>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6 text-center border-2 border-emerald-200">
            <div className="text-4xl mb-4">⚡</div>
            <h3 className="font-semibold text-lg text-emerald-700 mb-2">Natural Chemistry</h3>
            <p className="text-gray-600 text-sm">Authentic reactions that casting directors immediately notice.</p>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6 text-center border-2 border-emerald-200">
            <div className="text-4xl mb-4">🎬</div>
            <h3 className="font-semibold text-lg text-emerald-700 mb-2">No Editing</h3>
            <p className="text-gray-600 text-sm">Record in real-time. No syncing, no post-production headaches.</p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white rounded-3xl shadow-lg p-8 sm:p-12">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-10">
            How It Works
          </h2>
          
          <div className="space-y-8">
            {[
              {
                step: "1",
                title: "Browse & Book",
                desc: "Find an available reader who fits your scene. Filter by gender, age range, or language. Book instantly for 15, 30, or 60 minutes."
              },
              {
                step: "2",
                title: "Share Your Sides",
                desc: "Upload your audition script so your reader can prepare the other character's lines before your session."
              },
              {
                step: "3",
                title: "Record Your Audition",
                desc: "Your reader joins via video and delivers the lines LIVE while you perform and record. Real reactions. Natural timing."
              },
              {
                step: "4",
                title: "Submit & Book the Role",
                desc: "Send in a polished self-tape with authentic chemistry. Casting directors notice the difference."
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
        </div>
      </section>

      {/* Why Not AI */}
      <section className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-3xl p-8 border-2 border-red-200">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">
            Why Real Readers Beat AI Every Time
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold text-red-700 mb-4 flex items-center gap-2">
                <span>❌</span> AI Voices
              </h3>
              <ul className="space-y-2 text-gray-700 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-red-500">•</span>
                  <span>Robotic timing throws off your performance</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500">•</span>
                  <span>No emotional cues to react to</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500">•</span>
                  <span>Casting directors spot it instantly</span>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold text-emerald-700 mb-4 flex items-center gap-2">
                <span>✓</span> Real Readers
              </h3>
              <ul className="space-y-2 text-gray-700 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500">•</span>
                  <span>Natural pauses and pacing</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500">•</span>
                  <span>Genuine reactions to play off</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500">•</span>
                  <span>Authentic chemistry that stands out</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-4xl mx-auto px-6 py-12">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">
          Simple Pricing
        </h2>
        <p className="text-xl text-gray-600 text-center mb-10">
          No subscriptions. No monthly fees. Pay per session.
        </p>
        
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-md mx-auto">
          <div className="text-5xl font-bold text-emerald-600 mb-2">$15 - $60</div>
          <p className="text-gray-600 mb-6">per session (set by reader)</p>
          
          <ul className="space-y-3 text-left mb-8">
            <li className="flex items-center gap-3">
              <svg className="w-5 h-5 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-gray-700">Free to create an account</span>
            </li>
            <li className="flex items-center gap-3">
              <svg className="w-5 h-5 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-gray-700">Browse all readers for free</span>
            </li>
            <li className="flex items-center gap-3">
              <svg className="w-5 h-5 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-gray-700">15, 30, or 60 minute sessions</span>
            </li>
            <li className="flex items-center gap-3">
              <svg className="w-5 h-5 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-gray-700">Book instantly, no back-and-forth</span>
            </li>
          </ul>
          
          <Link
            href="/"
            className="inline-block w-full px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-lg rounded-xl transition"
          >
            Get Started →
          </Link>
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <div className="bg-gradient-to-r from-emerald-600 to-blue-600 rounded-3xl p-12 text-center text-white">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Ready to Level Up Your Self-Tapes?
          </h2>
          <p className="text-xl text-emerald-100 mb-8 max-w-xl mx-auto">
            Stop using AI. Start booking roles. The chemistry casting directors notice.
          </p>
          
          <Link
            href="/"
            className="inline-block px-10 py-4 bg-white text-emerald-600 font-semibold text-xl rounded-xl transition shadow-lg hover:shadow-xl hover:bg-gray-50"
          >
            Get Started →
          </Link>
        </div>
      </section>

      {/* Footer note */}
      <footer className="max-w-4xl mx-auto px-6 py-8 text-center text-gray-500 text-sm">
        <p>
          Questions? Email us at help@selftapereader.com
        </p>
      </footer>
    </main>
  );
}