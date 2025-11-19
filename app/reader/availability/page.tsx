
"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface CalendarConnection {
  id: string;
  provider: 'GOOGLE' | 'MICROSOFT';
  email: string;
  createdAt: string;
  isActive: boolean;
}

interface AvailabilityTemplate {
  id: string;
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  startTime: string; // "09:00"
  endTime: string;   // "17:00"
  isActive?: boolean;
}



export default function ManageAvailabilityPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [calendarConnection, setCalendarConnection] = useState<CalendarConnection | null>(null);
  const [availabilityTemplates, setAvailabilityTemplates] = useState<AvailabilityTemplate[]>([]);
  const [connectingGoogle, setConnectingGoogle] = useState(false);
  const lastTemplateRef = useRef<HTMLDivElement>(null);


  // Modal state for disconnect prompt
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [pendingProvider, setPendingProvider] = useState<"GOOGLE" | "MICROSOFT" | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  // Profile dropdown state and handlers
  // Profile dropdown state
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!(e.target as HTMLElement).closest('.group')) {
        setShowProfileDropdown(false);
      }
    }
    if (showProfileDropdown) {
      document.addEventListener('mousedown', handleClick);
    }
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showProfileDropdown]);

  // Logout handler
  const handleLogout = async () => {
    setShowProfileDropdown(false);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    window.location.href = '/login';
  };

  // Disconnect current calendar connection and continue with new provider
  async function disconnectCalendarAndContinue() {
    setDisconnecting(true);
    try {
      const response = await fetch('/api/calendar/disconnect', { method: 'POST' });
      if (response.ok) {
        setCalendarConnection(null);
        setShowDisconnectModal(false);
        // Continue with pending provider
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
  }

  // Availability settings
  const [maxAdvanceBooking, setMaxAdvanceBooking] = useState(360); // hours
  const [minAdvanceHours, setMinAdvanceHours] = useState(2);
  const [bookingBuffer, setBookingBuffer] = useState(15); // minutes

  // Day names in Monday-Sunday order for display, but values still map to 0-6 (Sun-Sat)
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const dayValues = [1, 2, 3, 4, 5, 6, 0]; // Corresponding dayOfWeek values for Mon-Sun
  
  // Helper function to get day name from dayOfWeek value (0-6)
  const getDayName = (dayOfWeek: number): string => {
    const dayNameMap = {
      0: 'Sunday', 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 
      4: 'Thursday', 5: 'Friday', 6: 'Saturday'
    };
    return dayNameMap[dayOfWeek as keyof typeof dayNameMap] || 'Unknown';
  };
  
  // Helper function to convert 24-hour time to AM/PM format
  const formatTimeToAMPM = (time24: string): string => {
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${hour12}:${minutes} ${ampm}`;
  };
  
  // Helper function to sort templates in Monday-Sunday order
  const sortTemplates = (templates: AvailabilityTemplate[]) => {
    return [...templates].sort((a, b) => {
      const dayOrderA = a.dayOfWeek === 0 ? 7 : a.dayOfWeek;
      const dayOrderB = b.dayOfWeek === 0 ? 7 : b.dayOfWeek;
      
      if (dayOrderA !== dayOrderB) {
        return dayOrderA - dayOrderB;
      }
      
      return a.startTime.localeCompare(b.startTime);
    });
  };


  useEffect(() => {
    // Always allow access to manage availability, regardless of onboarding status
    async function checkOnboardingAndFetch() {
      fetchData();
    }
    checkOnboardingAndFetch();
  }, []);

  const fetchData = async () => {
    try {
      // Get current user
      const userRes = await fetch('/api/auth/me');
      if (!userRes.ok) {
        router.push('/login');
        return;
      }
      const userData = await userRes.json();
      setUser(userData.user);

      if (userData.user.role !== 'READER' && userData.user.role !== 'ADMIN') {
        alert('You must be a reader or admin to access this page');
        router.push('/dashboard');
        return;
      }
      // Set isReaderOrAdmin after user is set (already handled by useState above)

      // Fetch calendar connection
      const calendarRes = await fetch(`/api/calendar/connection?userId=${userData.user.id}`);
      if (calendarRes.ok) {
        const calendarData = await calendarRes.json();
        setCalendarConnection(calendarData.connection);
      }

      // Fetch availability templates
      const templateRes = await fetch('/api/availability/templates');
      if (templateRes.ok) {
        const templateData = await templateRes.json();
        console.log('Loaded templates from API:', templateData.templates);
        const templates = templateData.templates || [];
        setAvailabilityTemplates(sortTemplates(templates));
        
        // If no templates exist, check if user has availability slots and create templates from them
        if (!templateData.templates || templateData.templates.length === 0) {
          console.log('No templates found, checking for existing availability slots...');
          await createTemplatesFromExistingSlots();
        } else {
          // If templates exist, check if we have actual availability slots for upcoming days
          const slotsRes = await fetch('/api/availability/slots');
          if (slotsRes.ok) {
            const slotsData = await slotsRes.json();
            if (!slotsData.slots || slotsData.slots.length === 0) {
              console.log('Templates found but no availability slots. Generating slots...');
              const generated = await generateAvailabilitySlots();
              if (generated) {
                console.log('Successfully generated availability slots from templates');
              }
            }
          }
        }
      } else {
        console.error('Failed to fetch templates:', templateRes.status, templateRes.statusText);
      }

      // Set user preferences
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
      const response = await fetch(`/api/calendar/google/start?readerId=${user.id}`);
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
  // iCal connection handler (stub)
  const connectICal = async () => {
    alert('iCal connection is not yet implemented. Please contact support if you need this feature.');
    // TODO: Implement iCal connection logic (upload .ics or provide URL)
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
      const response = await fetch(`/api/calendar/microsoft/start?readerId=${user.id}`);
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
  // Modal component
  function DisconnectModal() {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full">
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
    );
  }

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
      dayOfWeek: 1, // Monday
      startTime: "09:00",
      endTime: "17:00",
      isActive: true
    };
    setAvailabilityTemplates(prev => [...prev, newTemplate]);
    
    // Scroll to the new template after it's rendered
    setTimeout(() => {
      lastTemplateRef.current?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
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

  const generateAvailabilitySlots = async () => {
    try {
      const response = await fetch('/api/dev/generate-availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          readerId: user.id,
          daysAhead: 15,
          regenerate: false
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('Generated availability slots:', result);
        return true;
      } else {
        console.error('Failed to generate slots:', await response.text());
        return false;
      }
    } catch (error) {
      console.error('Error generating slots:', error);
      return false;
    }
  };

  const createTemplatesFromExistingSlots = async () => {
    try {
      const slotsRes = await fetch('/api/availability/slots');
      if (slotsRes.ok) {
        const slotsData = await slotsRes.json();
        if (slotsData.slots && slotsData.slots.length > 0) {
          // Group slots by day of week and time patterns
          const patterns = new Map();
          
          // Group slots by day and time, then find the most common patterns
          const dayTimeGroups = new Map();
          
          slotsData.slots.forEach((slot: any) => {
            const startDate = new Date(slot.startTime);
            const endDate = new Date(slot.endTime);
            const dayOfWeek = startDate.getDay();
            const startTime = `${String(startDate.getHours()).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')}`;
            const endTime = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;
            
            const key = `${dayOfWeek}-${startTime}-${endTime}`;
            if (!dayTimeGroups.has(key)) {
              dayTimeGroups.set(key, {
                dayOfWeek,
                startTime,
                endTime,
                count: 1,
                id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
              });
            } else {
              dayTimeGroups.get(key).count++;
            }
          });
          
          // Only keep patterns that appear multiple times or unique patterns
          const uniquePatterns = new Map();
          dayTimeGroups.forEach((pattern, key) => {
            const dayKey = `day-${pattern.dayOfWeek}`;
            if (!uniquePatterns.has(dayKey) || uniquePatterns.get(dayKey).count < pattern.count) {
              uniquePatterns.set(dayKey, pattern);
            }
          });
          
          const templatesFromSlots = Array.from(uniquePatterns.values());
          console.log('Created templates from existing slots:', templatesFromSlots);
          setAvailabilityTemplates(sortTemplates(templatesFromSlots));
        }
      }
    } catch (error) {
      console.error('Failed to create templates from slots:', error);
    }
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
      // Prepare templates for saving - convert all templates to the format expected by API
      // Remove ID field since the API will generate new IDs
      const templatesToSave = availabilityTemplates.map(template => ({
        dayOfWeek: template.dayOfWeek,
        startTime: template.startTime,
        endTime: template.endTime
      }));

      // Save templates
      const templatesResponse = await fetch('/api/availability/templates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templates: templatesToSave })
      });
      if (!templatesResponse.ok) {
        const templatesError = await templatesResponse.json();
        throw new Error(templatesError.error || 'Failed to save availability templates');
      }

      // Save settings
      const settingsResponse = await fetch('/api/readers/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxAdvanceBooking, minAdvanceHours, bookingBuffer })
      });
      if (!settingsResponse.ok) {
        const settingsError = await settingsResponse.json();
        throw new Error(settingsError.error || 'Failed to save settings');
      }

      // Force template-to-slot synchronization after successful save
      try {
        const syncResponse = await fetch('/api/availability/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        if (syncResponse.ok) {
          const syncResult = await syncResponse.json();
          // ...existing code...
        }
      } catch (syncError) {
        // ...existing code...
        try {
          const regenerateResponse = await fetch('/api/dev/generate-availability', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ readerId: user.id, daysAhead: 30, regenerate: true })
          });
          // ...existing code...
        } catch (fallbackError) {
          // ...existing code...
        }
      }

      // After saving, check onboarding status
      try {
        const onboardingRes = await fetch('/api/onboarding/status');
        if (onboardingRes.ok) {
          const onboardingData = await onboardingRes.json();
          if (onboardingData.status?.isComplete) {
            // All steps complete, route to dashboard
            router.push('/dashboard');
            return;
          } else if (onboardingData.status?.nextStepUrl) {
            // Route to the next incomplete step only
            router.push(onboardingData.status.nextStepUrl);
            return;
          }
        }
      } catch (e) {
        // If onboarding check fails, just continue as before
      }

      alert('Settings and availability saved successfully!');
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert(error instanceof Error ? error.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const forceSync = async () => {
    try {
      console.log('Manually forcing template-slot synchronization...');
      const response = await fetch('/api/availability/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const result = await response.json();
        alert(`Sync completed! Templates: ${result.templates}, Slots: ${result.beforeSlots} → ${result.afterSlots}`);
        fetchData(); // Refresh data
      } else {
        const error = await response.json();
        alert(`Sync failed: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Manual sync failed:', error);
      alert('Manual sync failed - check console for details');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading availability settings...</p>
      </div>
    );
  }

  if (!user || !(user.role === 'READER' || user.role === 'ADMIN')) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>You must be a reader or admin to access this page.</p>
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
          {/* Profile dropdown */}
          <div className="relative">
            <button
              className="flex items-center space-x-2 focus:outline-none group"
              onClick={() => setShowProfileDropdown((v) => !v)}
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
        {showDisconnectModal && <DisconnectModal />}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Manage Availability</h1>
          <p className="text-gray-600">Set up your calendar sync and availability preferences</p>
        </div>

        <div className="space-y-8">
          {/* Calendar Connection */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Calendar Integration</h2>
            {calendarConnection ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-green-900">
                      <span className="inline-block align-middle mr-1" title="Connected">
                        <svg className="h-5 w-5 text-green-600 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12l3 3 5-5" />
                        </svg>
                      </span>
                      {calendarConnection.provider} Calendar Connected
                    </h3>
                    <p className="text-sm text-green-700 mt-1">
                      Connected to: {calendarConnection.email}
                    </p>
                    <p className="text-sm text-green-600 mt-1">
                      Your calendar events will automatically block availability slots.
                    </p>
                  </div>
                  <button
                    onClick={disconnectCalendar}
                    className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition"
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-2">Connect Your Calendar</h3>
                <p className="text-sm text-blue-700 mb-4">
                  Sync your calendar to be available for bookings and avoid double-bookings.
                </p>
                <div className="grid sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    className={`rounded-xl border px-4 py-3 bg-white text-left ${connectingGoogle ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}
                    onClick={connectingGoogle ? undefined : connectGoogleCalendar}
                    disabled={connectingGoogle}
                    title={connectingGoogle ? 'Connecting...' : ''}
                  >
                    <div className="font-medium flex items-center gap-2">
                      <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="16" rx="2" fill="#fff"/><path d="M16 2v4M8 2v4M3 10h18" stroke="#2563eb" strokeWidth="2" strokeLinecap="round"/><rect x="3" y="4" width="18" height="16" rx="2" stroke="#2563eb" strokeWidth="2"/></svg>
                      Google Calendar
                    </div>
                    <div className="text-xs text-gray-500">
                      {connectingGoogle ? 'Connecting...' : 'Use your Google account'}
                    </div>
                  </button>
                  <button
                    type="button"
                    className={`rounded-xl border px-4 py-3 bg-white text-left ${connectingGoogle ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}
                    onClick={connectingGoogle ? undefined : connectMicrosoftCalendar}
                    disabled={connectingGoogle}
                    title={connectingGoogle ? 'Connecting...' : ''}
                  >
                    <div className="font-medium flex items-center gap-2">
                      <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="16" rx="2" fill="#fff"/><path d="M16 2v4M8 2v4M3 10h18" stroke="#6366f1" strokeWidth="2" strokeLinecap="round"/><rect x="3" y="4" width="18" height="16" rx="2" stroke="#6366f1" strokeWidth="2"/></svg>
                      Microsoft Outlook
                    </div>
                    <div className="text-xs text-gray-500">
                      Connect with Microsoft account
                    </div>
                  </button>
                  <button
                    type="button"
                    className={`rounded-xl border px-4 py-3 bg-white text-left ${connectingGoogle ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}
                    onClick={connectingGoogle ? undefined : connectICal}
                    disabled={connectingGoogle}
                    title={connectingGoogle ? 'Connecting...' : ''}
                  >
                    <div className="font-medium flex items-center gap-2">
                      <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="16" rx="2" fill="#fff"/><path d="M16 2v4M8 2v4M3 10h18" stroke="#4b5563" strokeWidth="2" strokeLinecap="round"/><rect x="3" y="4" width="18" height="16" rx="2" stroke="#4b5563" strokeWidth="2"/></svg>
                      iCal (.ics)
                    </div>
                    <div className="text-xs text-gray-500">
                      Connect with iCal/webcal URL
                    </div>
                  </button>
                </div>
                <p className="text-xs text-blue-600 mt-3">
                  We'll redirect you to authorize calendar access, or you can upload an iCal (.ics) file.
                </p>
              </div>
            )}
          </div>

          {/* Booking Settings */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Booking Preferences</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum Advance Booking
                </label>
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
                  <option value={192}>8 days</option>
                  <option value={216}>9 days</option>
                  <option value={240}>10 days</option>
                  <option value={264}>11 days</option>
                  <option value={288}>12 days</option>
                  <option value={312}>13 days</option>
                  <option value={336}>14 days (2 weeks)</option>
                  <option value={360}>15 days</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  How far in advance actors can book
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Advance Notice
                </label>
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
                <p className="text-xs text-gray-500 mt-1">
                  Minimum time before booking starts
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Buffer Between Sessions
                </label>
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
                <p className="text-xs text-gray-500 mt-1">
                  Break time between bookings
                </p>
              </div>
            </div>
          </div>

          {/* Weekly Availability Templates */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold">Weekly Availability Templates</h2>
                <p className="text-sm text-gray-600">Manage your regular weekly schedule patterns. These templates are used to generate your actual bookable time slots.</p>
              </div>
              <button
                onClick={addAvailabilityTemplate}
                className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition"
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Day of Week
                      </label>
                      <select
                        value={template.dayOfWeek}
                        onChange={(e) => updateTemplate(template.id, { dayOfWeek: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        {dayNames.map((day, index) => (
                          <option key={index} value={dayValues[index]}>{day}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Start Time
                      </label>
                      <input
                        type="time"
                        value={template.startTime}
                        onChange={(e) => updateTemplate(template.id, { startTime: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        End Time
                      </label>
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