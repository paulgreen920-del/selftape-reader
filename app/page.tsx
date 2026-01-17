// app/page.tsx
"use client";
import Link from "next/link";

export default function Home() {
  return (
    <main className="relative flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-emerald-50 to-white px-6">
      {/* HERO SECTION */}
      <section className="max-w-6xl w-full py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Hero Text */}
          <div className="text-center lg:text-left">
            <div className="inline-block bg-red-100 text-red-700 px-4 py-2 rounded-full text-sm font-semibold mb-6">
              🚫 No AI Voices • No Pre-Recorded Audio • No Editing Nightmares
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight">
              Real Readers for Your <span className="text-emerald-600">Self-Tape Auditions</span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto lg:mx-0">
              Book a real human to read opposite you while you record. Or become a reader and earn money helping fellow actors nail their auditions.
            </p>

            {/* SINGLE CTA */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <Link
                href="/signup"
                className="px-10 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-lg rounded-xl transition shadow-lg hover:shadow-xl"
              >
                Get Started
              </Link>
              <span className="text-gray-500 text-sm">No membership fees. No credit card required.</span>
            </div>

            {/* Anti-AI Message */}
            <div className="mt-8 bg-gray-900 text-white p-4 rounded-xl max-w-md mx-auto lg:mx-0">
              <p className="text-sm font-medium">
                ✓ Casting directors can tell the difference between AI and a real scene partner. Give yourself the edge.
              </p>
            </div>
          </div>

          {/* Hero Image */}
          <div className="relative">
            <div className="aspect-[4/3] bg-gradient-to-br from-emerald-100 to-blue-100 rounded-3xl shadow-2xl overflow-hidden">
              <img 
                src="/uploads/HeroImage.png" 
                alt="Actor recording self-tape with live reader"
                className="w-full h-full object-cover"
              />
            </div>
            
            {/* Floating elements */}
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-red-500 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-lg p-2 text-center">
              No AI Voices
            </div>
            <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg p-2 text-center">
              Real Human Readers
            </div>
          </div>
        </div>
      </section>

      {/* THE PROBLEM SECTION */}
      <section className="max-w-5xl w-full py-16 bg-gray-900 text-white rounded-3xl -mt-8">
        <div className="px-8 text-center">
          <h2 className="text-3xl font-bold mb-8">Tired of These Self-Tape Struggles?</h2>
          <div className="grid sm:grid-cols-3 gap-8">
            <div className="bg-gray-800 rounded-xl p-6">
              <div className="text-3xl mb-4">🤖</div>
              <h3 className="font-semibold mb-2">AI Voices Sound Fake</h3>
              <p className="text-gray-400 text-sm">Robotic timing ruins your performance. No emotional connection to react to.</p>
            </div>
            <div className="bg-gray-800 rounded-xl p-6">
              <div className="text-3xl mb-4">🎙️</div>
              <h3 className="font-semibold mb-2">Recording Your Own Lines</h3>
              <p className="text-gray-400 text-sm">Awkward pauses, unnatural pacing, hours of audio syncing in post.</p>
            </div>
            <div className="bg-gray-800 rounded-xl p-6">
              <div className="text-3xl mb-4">😬</div>
              <h3 className="font-semibold mb-2">Begging Friends to Help</h3>
              <p className="text-gray-400 text-sm">They're unavailable, they mumble, they don't understand acting.</p>
            </div>
          </div>
        </div>
      </section>

      {/* THE SOLUTION */}
      <section className="max-w-5xl w-full py-16">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">The Solution: Live Human Readers</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Book an experienced reader who joins your video call and <strong>speaks the other character's lines live</strong> while you perform and record your audition.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 text-center border-2 border-emerald-200">
            <div className="text-4xl mb-4">🎭</div>
            <h3 className="font-semibold text-lg text-emerald-700 mb-2">Real Scene Partner</h3>
            <p className="text-gray-600 text-sm">A human who understands timing, emotion, and gives you something real to react to.</p>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6 text-center border-2 border-emerald-200">
            <div className="text-4xl mb-4">⚡</div>
            <h3 className="font-semibold text-lg text-emerald-700 mb-2">Natural Chemistry</h3>
            <p className="text-gray-600 text-sm">Authentic reactions and genuine pacing that casting directors immediately notice.</p>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6 text-center border-2 border-emerald-200">
            <div className="text-4xl mb-4">🎬</div>
            <h3 className="font-semibold text-lg text-emerald-700 mb-2">Record in Real-Time</h3>
            <p className="text-gray-600 text-sm">No editing, no syncing, no post-production headaches. Just hit record and perform.</p>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS SECTION */}
      <section className="max-w-6xl w-full py-20 bg-white rounded-3xl shadow-lg">
        <div className="px-8">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-4">
            How It Works
          </h2>
          <p className="text-xl text-gray-600 text-center mb-12 max-w-3xl mx-auto">
            Whether you're booking a reader or becoming one, we've made it simple.
          </p>

          <div className="grid md:grid-cols-2 gap-16">
            {/* For Actors */}
            <div>
              <h3 className="text-2xl font-semibold text-emerald-600 mb-8 flex items-center gap-3">
                <span className="w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold">🎭</span>
                Book a Reader
              </h3>
              <div className="space-y-6">
                {[
                  {
                    step: "1",
                    title: "Browse & Book",
                    desc: "Find an available reader who fits your scene. Filter by gender, age range, language, or specialty. Book instantly for 15, 30, or 60 minutes."
                  },
                  {
                    step: "2", 
                    title: "Share Your Sides",
                    desc: "Upload your audition script so your reader can prepare the other character's lines before your session."
                  },
                  {
                    step: "3",
                    title: "Record Your Audition",
                    desc: "Your reader joins via video and delivers the off-camera lines LIVE while you perform and record. Real reactions. Natural timing. No AI."
                  },
                  {
                    step: "4",
                    title: "Submit & Book the Role",
                    desc: "Send in a polished self-tape with authentic chemistry. Casting directors notice the difference."
                  }
                ].map((item) => (
                  <div key={item.step} className="flex gap-4">
                    <div className="w-8 h-8 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-1">
                      {item.step}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">{item.title}</h4>
                      <p className="text-gray-600 text-sm">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* For Readers */}
            <div>
              <h3 className="text-2xl font-semibold text-emerald-600 mb-8 flex items-center gap-3">
                <span className="w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold">💰</span>
                Become a Reader
              </h3>
              <div className="space-y-6">
                {[
                  {
                    step: "1",
                    title: "Create Your Profile",
                    desc: "Set your rates, availability, and showcase your experience. It takes about 5 minutes."
                  },
                  {
                    step: "2",
                    title: "Set Your Schedule", 
                    desc: "Connect your calendar and mark your available hours. Actors book you directly—no back-and-forth."
                  },
                  {
                    step: "3",
                    title: "Deliver the Lines",
                    desc: "Join the video session and read the other character's lines while the actor records. Be the scene partner they need."
                  },
                  {
                    step: "4",
                    title: "Get Paid",
                    desc: "Automatic payments after each session. You keep 80% of your rate. Build steady income helping actors succeed."
                  }
                ].map((item) => (
                  <div key={item.step} className="flex gap-4">
                    <div className="w-8 h-8 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-1">
                      {item.step}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">{item.title}</h4>
                      <p className="text-gray-600 text-sm">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WHY NOT AI SECTION */}
      <section className="max-w-5xl w-full py-16">
        <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-3xl p-8 border-2 border-red-200">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">
            Why Real Readers Beat AI Every Time
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold text-red-700 mb-4 flex items-center gap-2">
                <span>❌</span> AI Voices & Pre-Recorded Audio
              </h3>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">•</span>
                  <span>Robotic, unnatural timing that throws off your performance</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">•</span>
                  <span>No emotional cues to react to—you're acting in a vacuum</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">•</span>
                  <span>Hours spent syncing audio in editing software</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">•</span>
                  <span>Casting directors can spot fake scene partners instantly</span>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold text-emerald-700 mb-4 flex items-center gap-2">
                <span>✅</span> Real Human Readers
              </h3>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-1">•</span>
                  <span>Natural pauses and pacing that match real conversation</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-1">•</span>
                  <span>Genuine reactions that give you something to play off</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-1">•</span>
                  <span>Record once, submit immediately—no post-production</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-1">•</span>
                  <span>Authentic chemistry that makes your audition stand out</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS SECTION */}
      <section className="max-w-6xl w-full py-20 bg-gradient-to-r from-emerald-50 to-blue-50 rounded-3xl">
        <div className="px-8">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-4">
            What Actors Are Saying
          </h2>
          <p className="text-xl text-gray-600 text-center mb-12">
            Real feedback from actors who stopped using AI and started booking
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-gray-700 mb-4 italic">
                "I was using an AI voice app for months and wondering why I wasn't booking. First audition with a real reader? Callback. The difference is night and day."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-600 text-white rounded-full flex items-center justify-center font-semibold">
                  S
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Sarah M.</p>
                  <p className="text-sm text-gray-600">Working Actor, LA</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-gray-700 mb-4 italic">
                "No more spending 2 hours editing audio to sync with my performance. I book a reader, record my tape in real-time, and I'm done. Game changer."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                  J
                </div>
                <div>
                  <p className="font-semibold text-gray-900">James T.</p>
                  <p className="text-sm text-gray-600">TV Actor, NYC</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-gray-700 mb-4 italic">
                "My agent noticed immediately. She said my self-tapes finally have real chemistry. That's because I'm actually acting with someone now, not a robot."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-600 text-white rounded-full flex items-center justify-center font-semibold">
                  M
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Maria L.</p>
                  <p className="text-sm text-gray-600">Commercial Actor, Chicago</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SIMPLE PRICING */}
      <section className="max-w-4xl w-full py-20">
        <h2 className="text-4xl font-bold text-center text-gray-900 mb-4">
          Simple, Transparent Pricing
        </h2>
        <p className="text-xl text-gray-600 text-center mb-12">
          No subscriptions. No monthly fees. We only earn when readers earn.
        </p>

        <div className="bg-white rounded-3xl p-8 shadow-lg border-2 border-emerald-200">
          <div className="grid md:grid-cols-2 gap-8 divide-y md:divide-y-0 md:divide-x divide-gray-200">
            {/* Actors */}
            <div className="text-center pb-8 md:pb-0 md:pr-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4">For Actors</h3>
              <ul className="space-y-3 text-left max-w-xs mx-auto">
                <li className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700">Create account for free</span>
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
                  <span className="text-gray-700">Pay per session ($15-60)</span>
                </li>
              </ul>
            </div>

            {/* Readers */}
            <div className="text-center pt-8 md:pt-0 md:pl-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4">For Readers</h3>
              <ul className="space-y-3 text-left max-w-xs mx-auto">
                <li className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700">No membership fees</span>
                </li>
                <li className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700">Set your own rates</span>
                </li>
                <li className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700">Keep 80% of every booking</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Founding Member Note */}
          <div className="mt-8 pt-8 border-t border-gray-200 text-center">
            <div className="inline-block bg-emerald-50 text-emerald-800 px-4 py-2 rounded-full text-sm font-medium mb-4">
              🎉 Founding Member Benefit
            </div>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Join during our launch period and your account stays free forever—even if we introduce membership fees later. We only earn when you do.
            </p>
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="max-w-4xl w-full py-20 bg-gradient-to-r from-emerald-600 to-blue-600 rounded-3xl text-white text-center">
        <div className="p-12">
          <h2 className="text-4xl font-bold mb-6">
            Ready to Level Up Your Self-Tapes?
          </h2>
          <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
            Join actors who are booking more roles with real scene partners. Or become a reader and start earning.
          </p>
          <Link
            href="/signup"
            className="inline-block bg-white text-emerald-600 px-10 py-4 rounded-xl font-semibold text-lg hover:bg-gray-50 transition shadow-lg"
          >
            Get Started
          </Link>
          <p className="mt-4 text-emerald-100 text-sm">
            No membership fees. No credit card required.
          </p>
        </div>
      </section>

      {/* Footer Note */}
      <footer className="max-w-4xl w-full py-8 text-center text-gray-500 text-sm">
        <p>
          Founding members who join during our launch period will never pay membership fees, even if we introduce them later. 
          Readers keep 80% of every booking—we only earn when you do.
        </p>
      </footer>
    </main>
  );
}