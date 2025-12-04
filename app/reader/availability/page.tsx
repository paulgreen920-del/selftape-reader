"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface User {
  id: string;
  name: string;
  email: string;
  role: 'READER' | 'ADMIN' | 'USER';
  timezone?: string;
}

interface CalendarConnection {
  id: string;
  provider: 'GOOGLE' | 'MICROSOFT';
  email: string;
  createdAt: string;
  isActive: boolean;
}

interface AvailabilityTemplate {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive?: boolean;
}

const TIMEZONE_OPTIONS = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HT)" },
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "Europe/Paris", label: "Paris (CET/CEST)" },
  { value: "Europe/Berlin", label: "Berlin (CET/CEST)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Asia/Shanghai", label: "Shanghai (CST)" },
  { value: "Asia/Dubai", label: "Dubai (GST)" },
  { value: "Australia/Sydney", label: "Sydney (AEST/AEDT)" },
];

export default function ManageAvailabilityPage() {
    const [showAppleTutorial, setShowAppleTutorial] = useState(false);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [calendarConnection, setCalendarConnection] = useState<CalendarConnection | null>(null);
  const [icalConnections, setIcalConnections] = useState<Array<{ id: string; name: string; url: string }>>([]);
  const [availabilityTemplates, setAvailabilityTemplates] = useState<AvailabilityTemplate[]>([]);
  const [connectingGoogle, setConnectingGoogle] = useState(false);
  const lastTemplateRef = useRef<HTMLDivElement>(null);

  const [timezone, setTimezone] = useState(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return "America/New_York";
    }
  });

  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [pendingProvider, setPendingProvider] = useState<"GOOGLE" | "MICROSOFT" | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  const [maxAdvanceBooking, setMaxAdvanceBooking] = useState(360);
  const [minAdvanceHours, setMinAdvanceHours] = useState(2);
  const [bookingBuffer, setBookingBuffer] = useState(15);

  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const dayValues = [1, 2, 3, 4, 5, 6, 0];

  const getDayName = (dayOfWeek: number): string => {
    const dayNameMap: Record<number, string> = {
      0: 'Sunday', 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday',
      4: 'Thursday', 5: 'Friday', 6: 'Saturday'
    };
    return dayNameMap[dayOfWeek] || 'Unknown';
  };

  const formatTimeToAMPM = (time24: string): string => {
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const sortTemplates = (templates: AvailabilityTemplate[]) => {
    return [...templates].sort((a, b) => {
      const dayOrderA = a.dayOfWeek === 0 ? 7 : a.dayOfWeek;
      const dayOrderB = b.dayOfWeek === 0 ? 7 : b.dayOfWeek;
      if (dayOrderA !== dayOrderB) return dayOrderA - dayOrderB;
      return a.startTime.localeCompare(b.startTime);
    });
  };

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!(e.target as HTMLElement).closest('.profile-dropdown')) {
        setShowProfileDropdown(false);
      }
    }
    if (showProfileDropdown) {
      document.addEventListener('mousedown', handleClick);
    }
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showProfileDropdown]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const userRes = await fetch('/api/auth/me');
      if (!userRes.ok) {
        router.push('/login');
        return;
      }
      const userData = await userRes.json();
      setUser(userData.user);

      if (userData.user.timezone) {
        setTimezone(userData.user.timezone);
      }

      if (userData.user.role !== 'READER' && userData.user.role !== 'ADMIN') {
        alert('You must be a reader or admin to access this page');
        router.push('/dashboard');
        return;
      }

      const calendarRes = await fetch(`/api/calendar/connection?userId=${userData.user.id}`);
      if (calendarRes.ok) {
        const calendarData = await calendarRes.json();
        setCalendarConnection(calendarData.connection);
      }
      // Fetch Apple Calendar connections
      const icalRes = await fetch('/api/calendar/ical');
      const icalData = await icalRes.json();
      if (icalData.ok && Array.isArray(icalData.connections)) {
        setIcalConnections(icalData.connections);
      }

      const templateRes = await fetch('/api/availability/templates');
      if (templateRes.ok) {
        const templateData = await templateRes.json();
        const templates = templateData.templates || [];
        setAvailabilityTemplates(sortTemplates(templates));
      }

      setMaxAdvanceBooking(userData.user.maxAdvanceBooking || 360);
      setMinAdvanceHours(userData.user.minAdvanceHours || 1);
      setBookingBuffer(userData.user.bookingBuffer || 15);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      alert('Failed to load availability settings');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setShowProfileDropdown(false);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    window.location.href = '/login';
  };

  const connectGoogleCalendar = async () => {
    if (calendarConnection) {
      setPendingProvider("GOOGLE");
      setShowDisconnectModal(true);
      return;
    }
    if (!user?.id) {
      alert('User not loaded yet. Please try again.');
      return;
    }
    setConnectingGoogle(true);
    try {
      const response = await fetch(`/api/calendar/google/start?readerId=${user.id}&returnTo=dashboard`);
      const data = await response.json();
      if (data.ok && data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        alert(data.error || 'Failed to initiate Google Calendar connection');
      }
    } catch (error) {
      console.error('Failed to connect Google Calendar:', error);
      alert('Failed to connect Google Calendar');
    } finally {
      setConnectingGoogle(false);
    }
  };

  const connectMicrosoftCalendar = async () => {
    if (calendarConnection) {
      setPendingProvider("MICROSOFT");
      setShowDisconnectModal(true);
      return;
    }
    if (!user?.id) {
      alert('User not loaded yet. Please try again.');
      return;
    }
    setConnectingGoogle(true);
    try {
      const response = await fetch(`/api/calendar/microsoft/start?readerId=${user.id}&returnTo=dashboard`);
      const data = await response.json();
      if (data.ok && data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        alert(data.error || 'Failed to initiate Microsoft Calendar connection');
      }
    } catch (error) {
      console.error('Failed to connect Microsoft Calendar:', error);
      alert('Failed to connect Microsoft Calendar');
    } finally {
      setConnectingGoogle(false);
    }
  };

  const connectICal = async () => {
    alert('iCal connection is not yet implemented. Please contact support if you need this feature.');
  };

  const disconnectCalendarAndContinue = async () => {
    setDisconnecting(true);
    try {
      const response = await fetch('/api/calendar/disconnect', { method: 'POST' });
      if (response.ok) {
        setCalendarConnection(null);
        setShowDisconnectModal(false);
        if (pendingProvider === "GOOGLE") {
          connectGoogleCalendar();
        } else if (pendingProvider === "MICROSOFT") {
          connectMicrosoftCalendar();
        }
        setPendingProvider(null);
      } else {
        alert('Failed to disconnect calendar');
      }
    } catch (error) {
      alert('Failed to disconnect calendar');
    } finally {
      setDisconnecting(false);
    }
  };

  const disconnectCalendar = async () => {
    if (!confirm('⚠️ Disconnecting your calendar will remove you from available bookings and disable conflict checking. Are you sure you want to continue?')) {
      return;
    }
    try {
      const response = await fetch('/api/calendar/disconnect', { method: 'POST' });
      if (response.ok) {
        setCalendarConnection(null);
        alert('Calendar disconnected successfully');
      } else {
        alert('Failed to disconnect calendar');
      }
    } catch (error) {
      console.error('Failed to disconnect calendar:', error);
      alert('Failed to disconnect calendar');
    }
  };

  const addAvailabilityTemplate = () => {
    const newTemplate = {
      id: `temp-${Date.now()}`,
      dayOfWeek: 1,
      startTime: "09:00",
      endTime: "17:00",
      isActive: true
    };
    setAvailabilityTemplates(prev => [...prev, newTemplate]);
    setTimeout(() => {
      lastTemplateRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const updateTemplate = (id: string, updates: Partial<AvailabilityTemplate>) => {
    setAvailabilityTemplates(prev => {
      const updated = prev.map(template =>
        template.id === id ? { ...template, ...updates, isActive: template.isActive ?? true } : template
      );
      return sortTemplates(updated);
    });
  };

  const duplicateTemplate = (id: string) => {
    const templateToDuplicate = availabilityTemplates.find(t => t.id === id);
    if (templateToDuplicate) {
      const newTemplate = {
        ...templateToDuplicate,
        id: `temp-${Date.now()}`,
        isActive: templateToDuplicate.isActive ?? true
      };
      setAvailabilityTemplates(prev => sortTemplates([...prev, newTemplate]));
    }
  };

  const removeTemplate = (id: string) => {
    if (confirm('Are you sure you want to remove this time block?')) {
      setAvailabilityTemplates(prev => prev.filter(template => template.id !== id));
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const templatesToSave = availabilityTemplates.map(template => ({
        dayOfWeek: template.dayOfWeek,
        startTime: template.startTime,
        endTime: template.endTime
      }));

      const templatesResponse = await fetch('/api/availability/templates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templates: templatesToSave })
      });
      if (!templatesResponse.ok) {
        const templatesError = await templatesResponse.json();
        throw new Error(templatesError.error || 'Failed to save availability templates');
      }

      const settingsResponse = await fetch('/api/readers/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxAdvanceBooking, minAdvanceHours, bookingBuffer, timezone })
      });
      if (!settingsResponse.ok) {
        const settingsError = await settingsResponse.json();
        throw new Error(settingsError.error || 'Failed to save settings');
      }

      try {
        const syncResponse = await fetch('/api/availability/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        if (syncResponse.ok) {
          const syncResult = await syncResponse.json();
          console.log('Sync result:', syncResult);
        }
      } catch (syncError) {
        console.error('Sync failed, trying fallback:', syncError);
      }

      try {
        const onboardingRes = await fetch('/api/onboarding/status');
        if (onboardingRes.ok) {
          const onboardingData = await onboardingRes.json();
          if (onboardingData.status?.isComplete) {
            router.push('/dashboard');
            return;
          } else if (onboardingData.status?.nextStepUrl) {
            router.push(onboardingData.status.nextStepUrl);
            return;
          }
        }
      } catch (e) {}

      alert('Settings and availability saved successfully!');
      fetchData();
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert(error instanceof Error ? error.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <Link href="/dashboard" className="text-blue-600 hover:underline text-sm">
              ← Back to Dashboard
            </Link>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p>Loading availability settings...</p>
        </main>
      </div>
    );
  }

  if (!user || (user.role !== 'READER' && user.role !== 'ADMIN')) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <Link href="/dashboard" className="text-blue-600 hover:underline text-sm">
              ← Back to Dashboard
            </Link>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p>You must be a reader or admin to access this page.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Disconnect Modal */}
      {showDisconnectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full mx-4">
            <h2 className="text-lg font-semibold mb-2">Only one calendar can be connected</h2>
            <p className="mb-4 text-gray-700">Would you like to disconnect your current calendar to connect a new one?</p>
            <div className="flex justify-end gap-3">
              <button
                className="px-4 py-2 rounded border text-gray-700 hover:bg-gray-100"
                onClick={() => { setShowDisconnectModal(false); setPendingProvider(null); }}
                disabled={disconnecting}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                onClick={disconnectCalendarAndContinue}
                disabled={disconnecting}
              >
                {disconnecting ? "Disconnecting..." : "Disconnect"}
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link href="/dashboard" className="text-blue-600 hover:underline text-sm">
            ← Back to Dashboard
          </Link>
          <div className="relative profile-dropdown">
            <button
              className="flex items-center space-x-2 focus:outline-none"
              onClick={() => setShowProfileDropdown(v => !v)}
            >
              <span className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-lg">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.25a8.25 8.25 0 1115 0v.75a.75.75 0 01-.75.75h-13.5a.75.75 0 01-.75-.75v-.75z" />
                </svg>
              </span>
            </button>
            {showProfileDropdown && (
              <div className="absolute right-0 mt-2 w-44 bg-white border border-gray-200 rounded shadow-lg z-50">
                <Link
                  href="/reader/profile"
                  className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                  onClick={() => setShowProfileDropdown(false)}
                >
                  Edit Profile
                </Link>
                <button
                  className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Manage Availability</h1>
          <p className="text-gray-600">Set up your calendar sync and availability preferences</p>
        </div>

        <div className="space-y-8">
          {/* Calendar Connection */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Calendar Integration</h2>
            {(calendarConnection || icalConnections.length > 0) ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div>
                    <h3 className="font-medium text-green-900 flex items-center gap-2">
                      <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12l3 3 5-5" />
                      </svg>
                      Calendar Connected
                    </h3>
                    {calendarConnection && (
                      <p className="text-sm text-green-700 mt-1">Connected to: {calendarConnection.email}</p>
                    )}
                    {calendarConnection && (
                      <p className="text-xs text-green-600 mt-1">Your {calendarConnection.provider === 'GOOGLE' ? 'Google Calendar' : 'Microsoft Outlook'} events will automatically block availability slots.</p>
                    )}
                    {icalConnections.length > 0 && (
                      <div className="text-xs text-purple-700 mt-1">Connected to Apple Calendar ({icalConnections.length} calendar{icalConnections.length > 1 ? 's' : ''} connected)</div>
                    )}
                  </div>
                  <button
                    onClick={disconnectCalendar}
                    className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition whitespace-nowrap"
                  >
                    Disconnect
                  </button>
                  {icalConnections.length > 0 && (
                    <button
                      onClick={() => router.push("/onboarding/schedule/apple?from=dashboard")}
                      className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition whitespace-nowrap ml-2"
                    >
                      Manage
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-2">Connect Your Calendar</h3>
                <p className="text-sm text-blue-700 mb-4">Sync your calendar to be available for bookings and avoid double-bookings.</p>
                <div className="grid sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    className={`rounded-xl border px-4 py-3 bg-white text-left ${connectingGoogle ? 'border-green-500' : 'hover:bg-gray-50'}`}
                    onClick={connectingGoogle ? undefined : connectGoogleCalendar}
                    disabled={connectingGoogle}
                  >
                    <div className="font-medium flex items-center gap-2">
                      <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="16" rx="2" fill="#fff"/>
                        <path d="M16 2v4M8 2v4M3 10h18" stroke="#2563eb" strokeWidth="2" strokeLinecap="round"/>
                        <rect x="3" y="4" width="18" height="16" rx="2" stroke="#2563eb" strokeWidth="2"/>
                      </svg>
                      Google Calendar
                    </div>
                    <div className="text-xs text-gray-500">{connectingGoogle ? 'Connecting...' : 'Use your Google account'}</div>
                  </button>
                  <button
                    type="button"
                    className={`rounded-xl border px-4 py-3 bg-white text-left ${connectingGoogle ? 'border-green-500' : 'hover:bg-gray-50'}`}
                    onClick={connectingGoogle ? undefined : connectMicrosoftCalendar}
                    disabled={connectingGoogle}
                  >
                    <div className="font-medium flex items-center gap-2">
                      <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="16" rx="2" fill="#fff"/>
                        <path d="M16 2v4M8 2v4M3 10h18" stroke="#6366f1" strokeWidth="2" strokeLinecap="round"/>
                        <rect x="3" y="4" width="18" height="16" rx="2" stroke="#6366f1" strokeWidth="2"/>
                      </svg>
                      Microsoft Outlook
                    </div>
                    <div className="text-xs text-gray-500">Connect with Microsoft account</div>
                  </button>
                  <button
                    type="button"
                    className={`rounded-xl border px-4 py-3 bg-white text-left ${icalConnections.length > 0 ? 'border-green-500' : 'hover:bg-gray-50'}`}
                    onClick={connectingGoogle ? undefined : () => router.push("/onboarding/schedule/apple?from=dashboard")}
                    disabled={connectingGoogle}
                  >
                    <div className="font-medium flex items-center gap-2">
                      <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="16" rx="2" fill="#fff"/>
                        <path d="M16 2v4M8 2v4M3 10h18" stroke="#4b5563" strokeWidth="2" strokeLinecap="round"/>
                        <rect x="3" y="4" width="18" height="16" rx="2" stroke="#4b5563" strokeWidth="2"/>
                      </svg>
                      Apple Calendar
                    </div>
                    <div className="text-xs text-gray-500">(iCloud Calendar)<br />{icalConnections.length > 0 ? `${icalConnections.length} connected` : 'Connect with iCal/webcal URL'}</div>
                    {icalConnections.length > 0 && (
                      <button
                        onClick={() => router.push("/onboarding/schedule/apple?from=dashboard")}
                        className="mt-2 text-xs text-blue-600 underline"
                      >
                        Manage
                      </button>
                    )}
                  </button>
                  {/* Apple Calendar tutorial moved to /onboarding/schedule/apple */}
                </div>
                <p className="text-xs text-blue-600 mt-3">We'll redirect you to authorize calendar access.</p>
              </div>
            )}
          </div>

          {/* Booking Settings */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Booking Preferences</h2>

            {/* Timezone */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Your Timezone</label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full sm:w-64 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {TIMEZONE_OPTIONS.map((tz) => (
                  <option key={tz.value} value={tz.value}>{tz.label}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Times you set below are in this timezone</p>
            </div>

            {/* Other settings */}
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Maximum Advance Booking</label>
                <select
                  value={maxAdvanceBooking}
                  onChange={(e) => setMaxAdvanceBooking(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value={0}>Same day only</option>
                  <option value={24}>1 day</option>
                  <option value={48}>2 days</option>
                  <option value={72}>3 days</option>
                  <option value={96}>4 days</option>
                  <option value={120}>5 days</option>
                  <option value={144}>6 days</option>
                  <option value={168}>7 days (1 week)</option>
                  <option value={336}>14 days (2 weeks)</option>
                  <option value={360}>15 days</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">How far in advance actors can book</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Advance Notice</label>
                <select
                  value={minAdvanceHours}
                  onChange={(e) => setMinAdvanceHours(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value={1}>1 hour</option>
                  <option value={2}>2 hours</option>
                  <option value={4}>4 hours</option>
                  <option value={24}>24 hours</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">Minimum time before booking starts</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Buffer Between Sessions</label>
                <select
                  value={bookingBuffer}
                  onChange={(e) => setBookingBuffer(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value={0}>No buffer</option>
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={60}>1 hour</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">Break time between bookings</p>
              </div>
            </div>
          </div>

          {/* Weekly Availability Templates */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <div>
                <h2 className="text-xl font-semibold">Weekly Availability Templates</h2>
                <p className="text-sm text-gray-600">Manage your regular weekly schedule patterns.</p>
              </div>
              <button
                onClick={addAvailabilityTemplate}
                className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition whitespace-nowrap"
              >
                Add Time Block
              </button>
            </div>

            <div className="space-y-4">
              {availabilityTemplates.map((template, index) => (
                <div
                  key={template.id}
                  className="border rounded-lg p-4"
                  ref={index === availabilityTemplates.length - 1 ? lastTemplateRef : null}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-gray-900">
                      {getDayName(template.dayOfWeek)} • {formatTimeToAMPM(template.startTime)} - {formatTimeToAMPM(template.endTime)}
                    </h3>
                  </div>
                  <div className="grid md:grid-cols-4 gap-4 items-end">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Day of Week</label>
                      <select
                        value={template.dayOfWeek}
                        onChange={(e) => updateTemplate(template.id, { dayOfWeek: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        {dayNames.map((day, idx) => (
                          <option key={idx} value={dayValues[idx]}>{day}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                      <input
                        type="time"
                        value={template.startTime}
                        onChange={(e) => updateTemplate(template.id, { startTime: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                      <input
                        type="time"
                        value={template.endTime}
                        onChange={(e) => updateTemplate(template.id, { endTime: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => duplicateTemplate(template.id)}
                        className="px-3 py-1 text-sm text-blue-600 hover:text-blue-700 border border-blue-300 rounded hover:bg-blue-50 transition-colors"
                      >
                        Duplicate
                      </button>
                      <button
                        onClick={() => removeTemplate(template.id)}
                        className="px-3 py-1 text-sm text-red-600 hover:text-red-700 border border-red-300 rounded hover:bg-red-50 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {availabilityTemplates.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>No weekly time slots configured yet.</p>
                  <p className="text-sm mt-1">Click "Add Time Block" above to create your first availability slot.</p>
                </div>
              )}
            </div>
          </div>

          {/* Save Settings */}
          <div className="flex justify-end space-x-4 pt-6 border-t">
            <Link
              href="/dashboard"
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition"
            >
              Cancel
            </Link>
            <button
              onClick={saveSettings}
              disabled={saving}
              className="px-6 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50 transition"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}