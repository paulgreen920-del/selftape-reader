"use client";

import Link from "next/link";

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
              Pricing
            </h1>
            <p className="mt-4 text-xl text-gray-600 max-w-2xl mx-auto">
              Actors pay per session. Readers set their own rates and keep 80%.
            </p>
          </div>
        </div>
      </div>

      {/* Actor Pricing */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">For Actors</h2>
          <p className="text-lg text-gray-600">
            Browse readers, book sessions, pay as you go.
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8 border-2 border-blue-500">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Free Account</h3>
              <p className="text-gray-600">Pay only when you book</p>
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
                *Each reader sets their own pricing
              </p>
            </div>

            <ul className="space-y-3 mb-8">
              <li className="flex items-start">
                <CheckIcon className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                <span className="text-gray-700">Browse all readers</span>
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
          </div>
        </div>
      </div>

      {/* Reader Pricing */}
      <div className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">For Readers</h2>
            <p className="text-lg text-gray-600">
              Set your rates, manage your schedule, get paid.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="bg-gradient-to-r from-emerald-50 to-blue-50 rounded-lg p-8 border-2 border-emerald-200">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900">
                  Free to Join
                </h3>
                <p className="text-gray-600 mt-2">
                  20% platform fee per booking
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
                        <p className="font-semibold text-gray-900">You keep 80%</p>
                        <p className="text-gray-600 text-sm">20% platform fee</p>
                      </div>
                    </div>
                    
                    <div className="bg-white rounded-lg p-4 border">
                      <p className="text-sm text-gray-600 mb-2">Examples:</p>
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
                      <span className="text-gray-700">Manage your availability</span>
                    </li>
                    <li className="flex items-start">
                      <CheckIcon className="w-5 h-5 text-emerald-500 mt-0.5 mr-3 flex-shrink-0" />
                      <span className="text-gray-700">Integrated video platform</span>
                    </li>
                    <li className="flex items-start">
                      <CheckIcon className="w-5 h-5 text-emerald-500 mt-0.5 mr-3 flex-shrink-0" />
                      <span className="text-gray-700">Calendar sync</span>
                    </li>
                    <li className="flex items-start">
                      <CheckIcon className="w-5 h-5 text-emerald-500 mt-0.5 mr-3 flex-shrink-0" />
                      <span className="text-gray-700">Earnings dashboard</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="text-center">
                <Link
                  href="/signup?role=READER"
                  className="inline-block bg-emerald-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-emerald-700 transition-colors"
                >
                  Become a Reader
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
          Questions
        </h2>
        
        <div className="space-y-8">
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
              After a session is booked, funds are transferred to your Stripe Connect account and 
              paid out on Stripe's standard schedule (typically 2-7 business days).
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              What payment methods are accepted?
            </h3>
            <p className="text-gray-600">
              Visa, Mastercard, American Express, and Discover via Stripe.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              How do video sessions work?
            </h3>
            <p className="text-gray-600">
              Sessions use our built-in video platform. You'll get a meeting link that works in any browser.
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gray-900 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to get started?
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Join actors and readers perfecting the art of self-taping.
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
        </div>
      </div>
    </div>
  );
}