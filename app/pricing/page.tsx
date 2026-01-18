"use client";

import Link from "next/link";

// Simple check icon component
const CheckIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl">
              Simple, Transparent Pricing
            </h1>
            <p className="mt-4 text-xl text-gray-600 max-w-2xl mx-auto">
              No membership fees for anyone. Readers set their own rates. We only earn when you do.
            </p>
          </div>
        </div>
      </div>

      {/* Actor Pricing */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">For Actors</h2>
          <p className="text-lg text-gray-600">
            Pay only for the sessions you book. No monthly fees, no commitments.
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8 border-2 border-blue-500">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Free Account</h3>
              <p className="text-gray-600">Pay only when you book a session</p>
            </div>

            <div className="mb-8 p-6 bg-blue-50 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-3 text-center">Typical Session Rates</h4>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">$15-25</div>
                  <div className="text-sm text-gray-600">15 minutes</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">$25-40</div>
                  <div className="text-sm text-gray-600">30 minutes</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">$50-80</div>
                  <div className="text-sm text-gray-600">60 minutes</div>
                </div>
              </div>
              <p className="text-xs text-gray-500 text-center mt-3">
                *Rates vary by reader. Each reader sets their own pricing.
              </p>
            </div>

            <ul className="space-y-3 mb-8">
              <li className="flex items-start">
                <CheckIcon className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                <span className="text-gray-700">Free to create an account</span>
              </li>
              <li className="flex items-start">
                <CheckIcon className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                <span className="text-gray-700">Browse all available readers</span>
              </li>
              <li className="flex items-start">
                <CheckIcon className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                <span className="text-gray-700">Filter by gender, age, specialty, union status</span>
              </li>
              <li className="flex items-start">
                <CheckIcon className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                <span className="text-gray-700">Book sessions instantly</span>
              </li>
              <li className="flex items-start">
                <CheckIcon className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                <span className="text-gray-700">Integrated video platform</span>
              </li>
              <li className="flex items-start">
                <CheckIcon className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                <span className="text-gray-700">Automatic calendar invites</span>
              </li>
              <li className="flex items-start">
                <CheckIcon className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                <span className="text-gray-700">Session history and receipts</span>
              </li>
            </ul>

            <Link
              href="/signup"
              className="block w-full text-center bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Get Started
            </Link>
            <p className="text-center text-sm text-gray-500 mt-3">
              No credit card required
            </p>
          </div>
        </div>
      </div>

      {/* Reader Pricing */}
      <div className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">For Readers</h2>
            <p className="text-lg text-gray-600">
              Earn money helping actors perfect their craft
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="bg-gradient-to-r from-emerald-50 to-blue-50 rounded-lg p-8 border-2 border-emerald-200">
              {/* Founding Member Badge */}
              <div className="text-center mb-8">
                <div className="inline-block bg-emerald-600 text-white px-4 py-1 rounded-full text-sm font-medium mb-4">
                  Founding Member Benefit
                </div>
                <h3 className="text-2xl font-bold text-gray-900">
                  Free to Join
                </h3>
                <p className="text-gray-600 mt-2">
                  No membership fees. We only earn when you do.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-8 mb-8">
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Your Earnings</h4>
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mr-4">
                        <span className="text-2xl font-bold text-emerald-600">80%</span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Keep 80% of every booking</p>
                        <p className="text-gray-600 text-sm">20% platform fee covers payment processing & support</p>
                      </div>
                    </div>
                    
                    <div className="bg-white rounded-lg p-4 border">
                      <p className="text-sm text-gray-600 mb-2">Example earnings:</p>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>30-min session at $30</span>
                          <span className="font-semibold">You earn: $24</span>
                        </div>
                        <div className="flex justify-between">
                          <span>60-min session at $60</span>
                          <span className="font-semibold">You earn: $48</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">What's Included</h4>
                  <ul className="space-y-2">
                    <li className="flex items-start">
                      <CheckIcon className="w-5 h-5 text-emerald-500 mt-0.5 mr-3 flex-shrink-0" />
                      <span className="text-gray-700">Profile in reader marketplace</span>
                    </li>
                    <li className="flex items-start">
                      <CheckIcon className="w-5 h-5 text-emerald-500 mt-0.5 mr-3 flex-shrink-0" />
                      <span className="text-gray-700">Set your own rates</span>
                    </li>
                    <li className="flex items-start">
                      <CheckIcon className="w-5 h-5 text-emerald-500 mt-0.5 mr-3 flex-shrink-0" />
                      <span className="text-gray-700">Manage your own availability</span>
                    </li>
                    <li className="flex items-start">
                      <CheckIcon className="w-5 h-5 text-emerald-500 mt-0.5 mr-3 flex-shrink-0" />
                      <span className="text-gray-700">Integrated video platform</span>
                    </li>
                    <li className="flex items-start">
                      <CheckIcon className="w-5 h-5 text-emerald-500 mt-0.5 mr-3 flex-shrink-0" />
                      <span className="text-gray-700">Automatic calendar sync</span>
                    </li>
                    <li className="flex items-start">
                      <CheckIcon className="w-5 h-5 text-emerald-500 mt-0.5 mr-3 flex-shrink-0" />
                      <span className="text-gray-700">Session management tools</span>
                    </li>
                    <li className="flex items-start">
                      <CheckIcon className="w-5 h-5 text-emerald-500 mt-0.5 mr-3 flex-shrink-0" />
                      <span className="text-gray-700">Earnings dashboard & reports</span>
                    </li>
                    <li className="flex items-start">
                      <CheckIcon className="w-5 h-5 text-emerald-500 mt-0.5 mr-3 flex-shrink-0" />
                      <span className="text-gray-700">Accept unlimited bookings</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Founding Member Note */}
              <div className="bg-white/70 rounded-lg p-4 mb-6 border border-emerald-200">
                <p className="text-sm text-gray-700 text-center">
                  <span className="font-semibold">Founding Member Guarantee:</span> Join during our launch period and your account stays free forever—even if we introduce membership fees later.
                </p>
              </div>

              <div className="text-center">
                <Link
                  href="/signup?role=READER"
                  className="inline-block bg-emerald-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-emerald-700 transition-colors"
                >
                  Become a Reader
                </Link>
                <p className="text-sm text-gray-600 mt-3">
                  No credit card required • Keep 80% of all earnings
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
          Frequently Asked Questions
        </h2>
        
        <div className="space-y-8">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Do actors pay a subscription fee?
            </h3>
            <p className="text-gray-600">
              No! Actors create free accounts and only pay for the individual sessions they book. 
              There are no monthly fees, commitments, or hidden charges.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Do readers pay a subscription fee?
            </h3>
            <p className="text-gray-600">
              No! Readers join for free and keep 80% of every booking. We only take a 20% platform fee 
              when you earn money—we only succeed when you do.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              How do readers set their rates?
            </h3>
            <p className="text-gray-600">
              Readers set their own rates for 15, 30, and 60-minute sessions. Typical rates range from 
              $15-25 for 15 minutes, $25-40 for 30 minutes, and $50-80 for 60 minutes.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              When do readers get paid?
            </h3>
            <p className="text-gray-600">
              Readers receive 80% of each session fee. After an actor completes payment, funds are 
              transferred to your Stripe Connect account and paid out according to Stripe's standard 
              payout schedule (typically 2-7 business days, depending on your bank).
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              What is the "Founding Member" benefit?
            </h3>
            <p className="text-gray-600">
              Readers who join during our launch period are guaranteed free membership forever. 
              If we ever introduce subscription fees in the future, founding members will be grandfathered 
              in and never have to pay them.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              What payment methods do you accept?
            </h3>
            <p className="text-gray-600">
              We accept all major credit cards (Visa, Mastercard, American Express, Discover) through 
              our secure Stripe payment processing.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              How are video sessions conducted?
            </h3>
            <p className="text-gray-600">
              All sessions take place through our integrated video platform. When you book a session, 
              you'll receive a meeting link that works in any browser—no downloads required.
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gray-900 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to elevate your self-tapes?
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Join our community of actors and readers perfecting the art of self-taping.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Get Started as Actor
            </Link>
            <Link
              href="/signup?role=READER"
              className="inline-block bg-emerald-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-emerald-700 transition-colors"
            >
              Become a Reader
            </Link>
          </div>
          <p className="text-sm text-gray-400 mt-4">
            No membership fees. No credit card required.
          </p>
        </div>
      </div>
    </div>
  );
}