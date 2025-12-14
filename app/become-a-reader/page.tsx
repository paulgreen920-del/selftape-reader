'use client';

import Link from 'next/link';

export default function BecomeReaderLanding() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
      {/* Hero Section */}
      <div className="max-w-4xl mx-auto px-4 pt-12 pb-16">
        
        {/* Beta Badge */}
        <div className="flex justify-center mb-8">
          <span className="bg-red-500 text-white px-6 py-2 rounded-full text-sm font-bold tracking-wide">
            🎬 BETA LAUNCH — LIMITED SPOTS
          </span>
        </div>

        {/* Main Headline */}
        <h1 className="text-4xl md:text-6xl font-extrabold text-center text-gray-900 mb-4">
          Become a{' '}
          <span className="text-emerald-600">Self-Tape Reader</span>
        </h1>

        {/* Subheadline */}
        <p className="text-xl md:text-2xl text-center text-gray-600 mb-8 max-w-2xl mx-auto">
          Help fellow actors nail their auditions.{' '}
          <span className="text-emerald-600 font-semibold">Get paid for your time.</span>
        </p>

        {/* Price Box */}
        <div className="bg-slate-800 rounded-2xl p-8 max-w-lg mx-auto mb-10 text-center shadow-xl">
          <p className="text-emerald-400 text-sm font-medium tracking-wide mb-2">
            ✨ LIMITED BETA OFFER ✨
          </p>
          <div className="text-5xl md:text-6xl font-extrabold text-yellow-400 mb-2">
            $1/month
          </div>
          <p className="text-slate-400 mb-4">
            for your first year <span className="line-through">(reg. $9.99/mo)</span>
          </p>
          <div className="bg-slate-700 rounded-lg py-3 px-6 inline-block">
            <span className="text-white font-medium">Use code: </span>
            <span className="text-yellow-400 font-bold text-xl">READER</span>
          </div>
        </div>

        {/* CTA Button */}
        <div className="text-center mb-12">
          <Link
            href="/signup?role=READER"
            className="inline-block bg-red-500 hover:bg-red-600 text-white text-xl font-bold py-4 px-12 rounded-full shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
          >
            Start Earning Today →
          </Link>
          <p className="text-gray-500 mt-4 text-sm">
            Free to sign up • Apply promo code at checkout
          </p>
        </div>

        {/* How It Works */}
        <div className="bg-white rounded-2xl p-8 shadow-lg mb-12">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-4xl mb-4">📝</div>
              <h3 className="font-bold text-lg mb-2">1. Create Your Profile</h3>
              <p className="text-gray-600">Set your rates, availability, and showcase your experience.</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">📅</div>
              <h3 className="font-bold text-lg mb-2">2. Get Booked</h3>
              <p className="text-gray-600">Actors find you and book sessions that fit your schedule.</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">💰</div>
              <h3 className="font-bold text-lg mb-2">3. Get Paid</h3>
              <p className="text-gray-600">Deliver lines via video call. Keep 80% of every booking.</p>
            </div>
          </div>
        </div>

        {/* Benefits */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6">
            <h3 className="font-bold text-lg text-emerald-800 mb-3">💵 Set Your Own Rates</h3>
            <p className="text-emerald-700">You decide what to charge. $15, $25, $50 per session — your call.</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6">
            <h3 className="font-bold text-lg text-emerald-800 mb-3">🏠 Work From Anywhere</h3>
            <p className="text-emerald-700">All sessions are via video call. Work from home, on set, wherever.</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6">
            <h3 className="font-bold text-lg text-emerald-800 mb-3">📆 Your Schedule</h3>
            <p className="text-emerald-700">Set your available hours. Only get booked when you want to work.</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6">
            <h3 className="font-bold text-lg text-emerald-800 mb-3">🎭 Help Fellow Actors</h3>
            <p className="text-emerald-700">Use your skills to help others book roles. Build your network.</p>
          </div>
        </div>

        {/* Earnings Calculator */}
        <div className="bg-slate-800 rounded-2xl p-8 text-center mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">
            Potential Earnings
          </h2>
          <div className="grid md:grid-cols-3 gap-6 text-white">
            <div className="bg-slate-700 rounded-xl p-6">
              <p className="text-slate-400 text-sm mb-1">5 sessions/week</p>
              <p className="text-3xl font-bold text-emerald-400">$400/mo</p>
              <p className="text-slate-400 text-xs mt-1">at $20 avg</p>
            </div>
            <div className="bg-slate-700 rounded-xl p-6 ring-2 ring-yellow-400">
              <p className="text-slate-400 text-sm mb-1">10 sessions/week</p>
              <p className="text-3xl font-bold text-yellow-400">$800/mo</p>
              <p className="text-slate-400 text-xs mt-1">at $20 avg</p>
            </div>
            <div className="bg-slate-700 rounded-xl p-6">
              <p className="text-slate-400 text-sm mb-1">20 sessions/week</p>
              <p className="text-3xl font-bold text-emerald-400">$1,600/mo</p>
              <p className="text-slate-400 text-xs mt-1">at $20 avg</p>
            </div>
          </div>
          <p className="text-slate-400 mt-4 text-sm">You keep 80% of every booking</p>
        </div>

        {/* Final CTA */}
        <div className="text-center bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-2xl p-10">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Start Earning?
          </h2>
          <p className="text-emerald-100 mb-6 text-lg">
            Join during beta and lock in <span className="font-bold">$1/month for a full year</span>.
          </p>
          <Link
            href="/signup?role=READER"
            className="inline-block bg-white hover:bg-gray-100 text-emerald-600 text-xl font-bold py-4 px-12 rounded-full shadow-lg hover:shadow-xl transition-all"
          >
            Become a Reader — $1/month →
          </Link>
          <p className="text-emerald-200 mt-4 text-sm">
            Use code <span className="font-bold text-white">READER</span> at checkout
          </p>
        </div>

        {/* Footer note */}
        <p className="text-center text-gray-400 mt-12 text-sm">
          Questions? Email us at support@selftapereader.com
        </p>
      </div>
    </div>
  );
}
