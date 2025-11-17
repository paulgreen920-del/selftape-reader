'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Booking = {
  id: string;
  actorName: string;
  actorEmail: string;
  startTime: string;
  endTime: string;
  status: string;
  priceCents: number;
  totalCents: number;
  readerEarningsCents: number;
  platformFeeCents: number;
  durationMinutes: number;
};

type EarningsSummary = {
  totalEarnings: number;
  futureEarnings: number;
  platformFees: number;
  grossRevenue: number;
  completedSessions: number;
  futureSessions: number;
  pendingSessions: number;
  monthlyEarnings: { [key: string]: number };
};

export default function ReaderEarningsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'all' | 'month' | 'quarter' | 'year'>('all');

  useEffect(() => {
    async function loadData() {
      try {
        // Get current user
        const userRes = await fetch('/api/auth/me');
        if (!userRes.ok) {
          router.push('/login');
          return;
        }
        const userData = await userRes.json();
        
        if (userData.user.role !== 'READER' && userData.user.role !== 'ADMIN') {
          router.push('/dashboard');
          return;
        }
        
        setUser(userData.user);

        // Load reader's bookings
        const bookingsRes = await fetch(`/api/bookings?readerId=${userData.user.id}&scope=all`);
        const bookingsData = await bookingsRes.json();

        if (!bookingsRes.ok || !bookingsData.ok) {
          throw new Error(bookingsData.error || 'Failed to load bookings');
        }

        setBookings(bookingsData.bookings || []);
      } catch (err) {
        console.error('Failed to load data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [router]);

  // Filter bookings based on time range
  const getFilteredBookings = () => {
    const now = new Date();
    let startDate: Date;

    switch (timeRange) {
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarter':
        const quarterStart = Math.floor(now.getMonth() / 3) * 3;
        startDate = new Date(now.getFullYear(), quarterStart, 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        return bookings;
    }

    return bookings.filter(booking => {
      const bookingDate = new Date(booking.startTime);
      return bookingDate >= startDate;
    });
  };

  const calculateEarnings = (bookingsList: Booking[]): EarningsSummary => {
    const now = new Date();
    const confirmedBookings = bookingsList.filter(b => b.status === 'CONFIRMED');
    const completedBookings = confirmedBookings.filter(b => new Date(b.endTime) < now);
    const futureBookings = confirmedBookings.filter(b => new Date(b.startTime) >= now);
    const pendingBookings = bookingsList.filter(b => b.status === 'PENDING');

    const completedEarnings = completedBookings.reduce((sum, b) => sum + (b.readerEarningsCents || 0), 0);
    const futureEarnings = futureBookings.reduce((sum, b) => sum + (b.readerEarningsCents || 0), 0);
    const totalEarnings = completedEarnings;
    const grossRevenue = confirmedBookings.reduce((sum, b) => sum + (b.totalCents || b.priceCents), 0);
    const platformFees = confirmedBookings.reduce((sum, b) => sum + (b.platformFeeCents || 0), 0);

    // Calculate monthly earnings for the past 12 months
    const monthlyEarnings: { [key: string]: number } = {};
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      monthlyEarnings[monthKey] = 0;
    }

    completedBookings.forEach(booking => {
      const bookingDate = new Date(booking.startTime);
      const monthKey = bookingDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      if (monthlyEarnings[monthKey] !== undefined) {
        monthlyEarnings[monthKey] += (booking.readerEarningsCents || 0);
      }
    });

    return {
      totalEarnings: totalEarnings / 100,
      futureEarnings: futureEarnings / 100,
      platformFees: platformFees / 100,
      grossRevenue: grossRevenue / 100,
      completedSessions: completedBookings.length,
      futureSessions: futureBookings.length,
      pendingSessions: pendingBookings.length,
      monthlyEarnings
    };
  };

  const filteredBookings = getFilteredBookings();
  const earnings = calculateEarnings(filteredBookings);
  const allTimeEarnings = calculateEarnings(bookings);

  // Get average session rate
  const avgSessionRate = earnings.completedSessions > 0 
    ? earnings.totalEarnings / earnings.completedSessions 
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <Link href="/dashboard" className="text-2xl font-bold text-gray-900 hover:text-emerald-600 transition">
              ← Back to Dashboard
            </Link>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p>Loading your earnings...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link href="/dashboard" className="text-2xl font-bold text-gray-900 hover:text-emerald-600 transition">
            ← Back to Dashboard
          </Link>
          <div className="flex gap-4">
            <Link href="/reader/bookings" className="text-sm text-gray-600 hover:text-gray-900">
              View Bookings
            </Link>
            <Link href="/reader/availability" className="text-sm text-gray-600 hover:text-gray-900">
              Manage Availability →
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Earnings & Analytics</h1>
          <p className="text-gray-600">Track your session income and performance</p>
        </div>

        {/* Time Range Filter */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="flex gap-2 p-4 border-b">
            <span className="text-sm font-medium text-gray-500 mr-4">Time Period:</span>
            {(['all', 'year', 'quarter', 'month'] as const).map(period => (
              <button
                key={period}
                onClick={() => setTimeRange(period)}
                className={`px-4 py-2 text-sm font-medium capitalize transition rounded-md ${
                  timeRange === period
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {period === 'all' ? 'All Time' : `This ${period}`}
              </button>
            ))}
          </div>
        </div>

        {/* Completed Earnings Section */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
            Completed Earnings
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium opacity-90 uppercase">Total Earned</h3>
              <p className="text-3xl font-bold mt-2">${earnings.totalEarnings.toFixed(2)}</p>
              <p className="text-sm opacity-75 mt-1">After platform fees</p>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 uppercase">Completed Sessions</h3>
              <p className="text-3xl font-bold text-gray-900 mt-2">{earnings.completedSessions}</p>
              <p className="text-sm text-gray-500 mt-1">
                {timeRange === 'all' ? 'All time' : `This ${timeRange}`}
              </p>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 uppercase">Average per Session</h3>
              <p className="text-3xl font-bold text-gray-900 mt-2">${avgSessionRate.toFixed(2)}</p>
              <p className="text-sm text-gray-500 mt-1">Completed earnings</p>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 uppercase">Gross Revenue</h3>
              <p className="text-3xl font-bold text-gray-900 mt-2">${(earnings.totalEarnings / 0.8).toFixed(2)}</p>
              <p className="text-sm text-gray-500 mt-1">Before platform fees</p>
            </div>
          </div>
        </div>

        {/* Future Earnings Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <span className="w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
            Future Earnings (Confirmed Sessions)
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium opacity-90 uppercase">Expected Earnings</h3>
              <p className="text-3xl font-bold mt-2">${earnings.futureEarnings.toFixed(2)}</p>
              <p className="text-sm opacity-75 mt-1">After platform fees</p>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 uppercase">Future Sessions</h3>
              <p className="text-3xl font-bold text-blue-600 mt-2">{earnings.futureSessions}</p>
              <p className="text-sm text-gray-500 mt-1">Confirmed & paid</p>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 uppercase">Average Future Rate</h3>
              <p className="text-3xl font-bold text-blue-600 mt-2">${(earnings.futureSessions > 0 ? earnings.futureEarnings / earnings.futureSessions : 0).toFixed(2)}</p>
              <p className="text-sm text-gray-500 mt-1">Per future session</p>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 uppercase">Future Gross</h3>
              <p className="text-3xl font-bold text-blue-600 mt-2">${(earnings.futureEarnings / 0.8).toFixed(2)}</p>
              <p className="text-sm text-gray-500 mt-1">Before platform fees</p>
            </div>
          </div>
        </div>

        {/* Revenue Breakdown */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Completed Revenue Breakdown</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Gross Revenue (Completed)</span>
                <span className="font-medium">${(earnings.totalEarnings / 0.8).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Platform Fee (20%)</span>
                <span className="font-medium text-red-600">-${((earnings.totalEarnings / 0.8) * 0.2).toFixed(2)}</span>
              </div>
              <hr />
              <div className="flex justify-between items-center text-lg font-semibold">
                <span className="text-green-600">Your Earnings (80%)</span>
                <span className="text-green-600">${earnings.totalEarnings.toFixed(2)}</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Future Revenue Breakdown</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Gross Revenue (Future)</span>
                <span className="font-medium">${(earnings.futureEarnings / 0.8).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Platform Fee (20%)</span>
                <span className="font-medium text-red-600">-${((earnings.futureEarnings / 0.8) * 0.2).toFixed(2)}</span>
              </div>
              <hr />
              <div className="flex justify-between items-center text-lg font-semibold">
                <span className="text-blue-600">Expected Earnings (80%)</span>
                <span className="text-blue-600">${earnings.futureEarnings.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Session Duration Breakdown</h3>
            <div className="space-y-3">
              {[15, 30, 60].map(duration => {
                const sessions = filteredBookings.filter(b => 
                  b.status === 'CONFIRMED' && 
                  b.durationMinutes === duration &&
                  new Date(b.endTime) < new Date()
                );
                const count = sessions.length;
                const revenue = sessions.reduce((sum, b) => sum + (b.readerEarningsCents || 0), 0) / 100;
                
                return (
                  <div key={duration} className="flex justify-between items-center">
                    <div>
                      <span className="font-medium">{duration} min sessions</span>
                      <span className="text-sm text-gray-500 ml-2">({count} sessions)</span>
                    </div>
                    <span className="font-medium text-green-600">${revenue.toFixed(2)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Monthly Earnings Chart (Simple Bar Chart) */}
        {timeRange === 'all' && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h3 className="text-lg font-semibold mb-4">Monthly Earnings (Last 12 Months)</h3>
            <div className="grid grid-cols-12 gap-2 items-end h-32">
              {Object.entries(allTimeEarnings.monthlyEarnings).map(([month, amount]) => {
                const maxAmount = Math.max(...Object.values(allTimeEarnings.monthlyEarnings));
                const height = maxAmount > 0 ? (amount / maxAmount) * 100 : 0;
                
                return (
                  <div key={month} className="flex flex-col items-center">
                    <div 
                      className="bg-emerald-500 w-full rounded-t transition-all duration-500 hover:bg-emerald-600"
                      style={{ height: `${height}%`, minHeight: amount > 0 ? '4px' : '0px' }}
                      title={`${month}: $${(amount / 100).toFixed(2)}`}
                    />
                    <span className="text-xs text-gray-500 mt-2 transform rotate-45 origin-left">
                      {month}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent High-Value Sessions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Booked Sessions</h3>
          <div className="space-y-3">
            {filteredBookings
              .filter(b => b.status === 'CONFIRMED')
              .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
              .slice(0, 10)
              .map(booking => {
                const date = new Date(booking.startTime);
                const earnings = (booking.readerEarningsCents || 0) / 100;
                const isCompleted = new Date(booking.endTime) < new Date();
                
                return (
                  <div key={booking.id} className="flex justify-between items-center py-3 border-b border-gray-100 last:border-0">
                    <div>
                      <div className="font-medium">{booking.actorName}</div>
                      <div className="text-sm text-gray-500">
                        {date.toLocaleDateString()} • {booking.durationMinutes} min
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-medium ${isCompleted ? 'text-green-600' : 'text-blue-600'}`}>
                        ${earnings.toFixed(2)} {!isCompleted && '(future)'}
                      </div>
                      <div className="text-xs text-gray-500">
                        ${((booking.totalCents || booking.priceCents) / 100).toFixed(2)} gross
                      </div>
                    </div>
                  </div>
                );
              })}
            
            {filteredBookings.filter(b => b.status === 'CONFIRMED').length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p>No confirmed sessions in this time period.</p>
                <Link href="/reader/availability" className="text-emerald-600 hover:text-emerald-700 mt-2 inline-block">
                  Set up your availability to start earning →
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Tips for Increasing Earnings */}
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-6 mt-8">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">💡 Tips to Increase Your Earnings</h3>
          <ul className="space-y-2 text-blue-800">
            <li>• <strong>Optimize your availability:</strong> Be available during peak hours (evenings and weekends)</li>
            <li>• <strong>Maintain high ratings:</strong> Professional feedback helps actors book repeat sessions</li>
            <li>• <strong>Offer longer sessions:</strong> 60-minute sessions have the highest per-minute rates</li>
            <li>• <strong>Complete your profile:</strong> A detailed bio and experience section attracts more bookings</li>
            <li>• <strong>Be reliable:</strong> Show up on time and be prepared for each session</li>
          </ul>
        </div>
      </main>
    </div>
  );
}