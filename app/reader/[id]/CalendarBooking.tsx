"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type TimeSlot = {
  startMin: number;
  endMin: number;
  startTime: string;
  endTime: string;
};

type Reader = {
  id: string;
  displayName?: string | null;
  name?: string;
  headshotUrl?: string | null;
  ratePer15Min?: number | null;
  ratePer30Min?: number | null;
  ratePer60Min?: number | null;
  maxAdvanceBooking?: number | null;
};

type AvailabilitySlot = any;

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function CalendarBooking({ 
  reader,
  availability 
}: { 
  reader: Reader;
  availability: AvailabilitySlot[];
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [duration, setDuration] = useState<15 | 30 | 60>(30);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [loadingAvailability, setLoadingAvailability] = useState(true);
  const [actorName, setActorName] = useState("");
  const [actorEmail, setActorEmail] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);
  const [availableDays, setAvailableDays] = useState<string[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [actorTimezone, setActorTimezone] = useState<string>('');
  const [loadingTimezone, setLoadingTimezone] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [sidesFile, setSidesFile] = useState<File | null>(null);
  const [sidesLink, setSidesLink] = useState<string>('');
  const [uploadingFile, setUploadingFile] = useState(false);

  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: Array<Date | null> = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const days = getDaysInMonth();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + (reader.maxAdvanceBooking || 15));

  const isDateAvailable = (date: Date | null) => {
    if (!date) return false;
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    
    if (compareDate < today || compareDate > maxDate) return false;
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    const isAvailable = availableDays.includes(dateStr);
    console.log(`Date ${dateStr} availability:`, isAvailable, 'Available days:', availableDays);
    
    return isAvailable;
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
    setSelectedDate(null);
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
    setSelectedDate(null);
  };

  const selectDate = async (date: Date | null) => {
    if (!date || !isDateAvailable(date)) return;

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    setSelectedDate(dateStr);
    setLoadingSlots(true);

    try {
      const timestamp = Date.now();
      const res = await fetch(
  `/api/schedule/available-slots?readerId=${reader.id}&date=${dateStr}&duration=${duration}&timezone=${encodeURIComponent(actorTimezone)}&_t=${timestamp}`
);
      const data = await res.json();
      
      if (data.ok) {
        setSlots(data.slots || []);
        
        if (!data.slots || data.slots.length === 0) {
          setAvailableDays(prev => prev.filter(d => d !== dateStr));
          setSelectedDate(null);
        } else {
          setTimeout(() => {
            const timeSlotsSection = document.getElementById('time-slots-section');
            if (timeSlotsSection) {
              timeSlotsSection.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
              });
            }
          }, 100);
        }
      }
    } catch (err) {
      console.error("Failed to load slots:", err);
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  useEffect(() => {
    if (selectedDate) {
      const [year, month, day] = selectedDate.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      selectDate(date);
    }
  }, [duration]);

  useEffect(() => {
    async function fetchAvailableDays() {
      setLoadingAvailability(true);
      try {
        console.log('Fetching available days for reader:', reader.id, 'duration:', duration);
        const res = await fetch(
          `/api/schedule/available-days?readerId=${reader.id}&duration=${duration}`
        );
        const data = await res.json();
        console.log('Available days response:', data);
        if (data.ok) {
          setAvailableDays(data.availableDays || []);
        } else {
          console.error('API returned error:', data.error);
          setAvailableDays([]);
        }
      } catch (err) {
        console.error("Failed to load available days:", err);
        setAvailableDays([]);
      } finally {
        setLoadingAvailability(false);
      }
    }
    fetchAvailableDays();
  }, [duration, reader.id, refreshKey]);

  useEffect(() => {
    async function init() {
      const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setActorTimezone(detectedTimezone);
      setLoadingTimezone(false);
      
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const data = await response.json();
          if (data.ok && data.user) {
            setUser(data.user);
            setActorName(data.user.name || '');
            setActorEmail(data.user.email || '');
            if (data.user.timezone) {
              setActorTimezone(data.user.timezone);
            }
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setLoadingUser(false);
      }
    }
    init();
  }, []);

  useEffect(() => {
    async function fetchAvailableDays() {
      try {
        const timestamp = Date.now();
        const res = await fetch(
          `/api/schedule/available-days?readerId=${reader.id}&duration=${duration}&_t=${timestamp}`
        );
        const data = await res.json();
        if (data.ok) {
          setAvailableDays(data.availableDays || []);
        }
      } catch (err) {
        console.error("Failed to load available days:", err);
        setAvailableDays([]);
      }
    }
    fetchAvailableDays();
  }, [currentMonth, refreshKey]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const bookingId = params.get('booking');
    const action = params.get('action');
    
    if (action === 'cancel' && bookingId) {
      console.log('Detected cancelled checkout, freeing slot for booking:', bookingId);
      
      fetch(`/api/bookings/${bookingId}/cancel`, { 
        method: 'POST' 
      })
        .then(() => {
          window.history.replaceState({}, '', window.location.pathname);
          setRefreshKey(prev => prev + 1);
        })
        .catch(err => {
          console.error('Failed to cancel booking:', err);
        });
    }
  }, []);

  const formatTime = (min: number) => {
    const h = Math.floor(min / 60);
    const m = min % 60;
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    const ampm = h < 12 ? "AM" : "PM";
    
    // The API returns minutes already converted to actor's timezone,
    // so we just display them directly without any timezone conversion
    return `${hour12}:${m.toString().padStart(2, "0")} ${ampm}`;
  };

  const getPrice = () => {
    if (duration === 15) return reader.ratePer15Min || 1500;
    if (duration === 30) return reader.ratePer30Min || 2500;
    return reader.ratePer60Min || 6000;
  };

  const bookSlot = async (slot: TimeSlot) => {
    if (!user || !user.id) {
      alert("Please sign in to book a session. You'll be redirected to the login page.");
      const redirectUrl = encodeURIComponent(window.location.pathname);
      window.location.href = `/login?redirect=${redirectUrl}`;
      return;
    }

    console.log('Booking with user:', user, 'slot:', slot);
    
    setBookingLoading(true);
    try {
      let sidesUrl = '';
      let sidesFileName = '';
      
      if (sidesFile) {
        setUploadingFile(true);
        const formData = new FormData();
        formData.append('file', sidesFile);
        
        const uploadRes = await fetch('/api/uploads', {
          method: 'POST',
          body: formData,
        });
        
        const uploadData = await uploadRes.json();
        if (uploadRes.ok && uploadData.url) {
          sidesUrl = uploadData.url;
          sidesFileName = sidesFile.name;
        }
        setUploadingFile(false);
      }
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          readerId: reader.id,
          actorId: user.id,
          date: selectedDate,
          startMin: slot.startMin,
          durationMin: duration,
          actorTimezone: actorTimezone,
          sidesUrl: sidesUrl || undefined,
          sidesLink: sidesLink || undefined,
          sidesFileName: sidesFileName || undefined,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to create booking");
      }

      if (data.checkoutUrl) {
        if (process.env.NODE_ENV === 'development') {
          try {
            await fetch('/api/dev/webhook-trigger', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ bookingId: data.bookingId })
            });
            console.log('Dev webhook triggered for booking:', data.bookingId);
          } catch (webhookErr) {
            console.log('Dev webhook failed (expected in production):', webhookErr);
          }
        }

        window.location.href = data.checkoutUrl;
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        alert("Booking request timed out. Please try again.");
      } else {
        alert(err.message || "Failed to book");
      }
      setBookingLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border shadow-sm p-6">
      {/* Back Navigation */}
      <div className="mb-6">
        <Link
          href="/readers"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-sm font-medium">Browse Other Readers</span>
        </Link>
      </div>

      {/* Reader Profile Header */}
      <div className="flex items-center gap-4 mb-8 pb-6 border-b">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border bg-gray-100 grid place-items-center text-xl font-semibold">
          {reader.headshotUrl ? (
            <img
              src={reader.headshotUrl}
              alt={reader.displayName || reader.name}
              className="h-full w-full object-cover"
            />
          ) : (
            (reader.displayName || reader.name || "")
              .split(" ")
              .map((p: string) => p[0])
              .join("")
              .slice(0, 2)
          )}
        </div>
        
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{reader.displayName || reader.name}</h1>
          <p className="text-gray-600">Book a Reading Session</p>
        </div>
      </div>

      {/* User Authentication Status */}
      {loadingUser ? (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      ) : !user ? (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-amber-400 mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-sm font-medium text-amber-900">Sign in required to book</p>
              <p className="text-sm text-amber-700 mt-1">
                You must <a href={`/login?redirect=${encodeURIComponent(window.location.pathname)}`} className="underline hover:no-underline font-medium">
                  sign in
                </a> or <a href={`/signup?redirect=${encodeURIComponent(window.location.pathname)}`} className="underline hover:no-underline font-medium">
                  create an account
                </a> to book reading sessions.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-emerald-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-sm font-medium text-emerald-900">Ready to book as {user.name}</p>
              <p className="text-sm text-emerald-700">{user.email}</p>
            </div>
          </div>
        </div>
      )}

      {/* Actor Info - Hidden */}
      <div className="hidden">
        <input type="text" value={actorName} onChange={(e) => setActorName(e.target.value)} />
        <input type="email" value={actorEmail} onChange={(e) => setActorEmail(e.target.value)} />
      </div>

      {/* Audition Sides Upload */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Audition Sides <span className="text-gray-500 font-normal">(Optional)</span>
        </label>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-600 mb-2">Upload PDF or Document</label>
            <div className="relative">
              <input
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    if (file.size > 10 * 1024 * 1024) {
                      alert('File size must be less than 10MB');
                      e.target.value = '';
                      return;
                    }
                    setSidesFile(file);
                    setSidesLink('');
                  }
                }}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer border border-gray-300 rounded-lg"
              />
              {sidesFile && (
                <div className="mt-2 flex items-center justify-between p-2 bg-emerald-50 rounded-lg">
                  <span className="text-sm text-emerald-700">📄 {sidesFile.name}</span>
                  <button
                    type="button"
                    onClick={() => setSidesFile(null)}
                    className="text-emerald-600 hover:text-emerald-800"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          </div>
          
          <div>
            <label className="block text-xs text-gray-600 mb-2">Or provide a link to sides</label>
            <input
              type="url"
              placeholder="https://..."
              value={sidesLink}
              onChange={(e) => {
                setSidesLink(e.target.value);
                if (e.target.value) setSidesFile(null);
              }}
              disabled={!!sidesFile}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>
        </div>
      </div>

      {/* Duration Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">Session Duration & Price</label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[15, 30, 60].map((d) => {
            const price = d === 15 ? (reader.ratePer15Min || 1500) : 
                         d === 30 ? (reader.ratePer30Min || 2500) : 
                         (reader.ratePer60Min || 6000);
            const isSelected = duration === d;
            
            return (
              <button
                key={d}
                type="button"
                className={`relative p-4 rounded-lg border-2 transition-all ${
                  isSelected 
                    ? "border-emerald-500 bg-emerald-50" 
                    : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                }`}
                onClick={() => setDuration(d as 15 | 30 | 60)}
              >
                <div className="text-center">
                  <div className="text-lg font-semibold">{d} minutes</div>
                  <div className={`text-sm ${isSelected ? "text-emerald-700" : "text-gray-600"}`}>
                    ${(price / 100).toFixed(0)}
                  </div>
                </div>
                {isSelected && (
                  <div className="absolute top-2 right-2">
                    <svg className="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Timezone Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">Your Timezone</label>
        <div className="relative">
          {loadingTimezone ? (
            <div className="animate-pulse bg-gray-200 rounded-lg h-12"></div>
          ) : (
            <select 
              value={actorTimezone}
              onChange={(e) => setActorTimezone(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white text-gray-900"
            >
              <optgroup label="United States">
                <option value="America/New_York">Eastern Time (EST/EDT)</option>
                <option value="America/Chicago">Central Time (CST/CDT)</option>
                <option value="America/Denver">Mountain Time (MST/MDT)</option>
                <option value="America/Los_Angeles">Pacific Time (PST/PDT)</option>
                <option value="America/Anchorage">Alaska Time (AKST/AKDT)</option>
                <option value="Pacific/Honolulu">Hawaii Time (HST)</option>
              </optgroup>
              
              <optgroup label="Canada">
                <option value="America/Toronto">Toronto (EST/EDT)</option>
                <option value="America/Winnipeg">Winnipeg (CST/CDT)</option>
                <option value="America/Calgary">Calgary (MST/MDT)</option>
                <option value="America/Vancouver">Vancouver (PST/PDT)</option>
              </optgroup>
              
              <optgroup label="Europe">
                <option value="Europe/London">London (GMT/BST)</option>
                <option value="Europe/Paris">Paris (CET/CEST)</option>
                <option value="Europe/Berlin">Berlin (CET/CEST)</option>
                <option value="Europe/Rome">Rome (CET/CEST)</option>
              </optgroup>
              
              <optgroup label="Asia Pacific">
                <option value="Asia/Tokyo">Tokyo (JST)</option>
                <option value="Asia/Shanghai">Shanghai (CST)</option>
                <option value="Australia/Sydney">Sydney (AEST/AEDT)</option>
              </optgroup>
              
              <optgroup label="Other">
                <option value="UTC">UTC (Coordinated Universal Time)</option>
              </optgroup>
            </select>
          )}
        </div>
      </div>

      {/* Calendar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-medium text-gray-700">Select Date</label>
          <button
            type="button"
            onClick={() => setRefreshKey(prev => prev + 1)}
            className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
          >
            ↻ Refresh Availability
          </button>
        </div>

        {loadingAvailability ? (
          <div className="flex flex-col items-center justify-center py-12">
            {/* Bouncing dots bubble */}
            <div className="bg-gray-200 rounded-2xl px-6 py-4 shadow-sm">
              <div className="flex space-x-2">
                <div className="w-3 h-3 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1s' }}></div>
                <div className="w-3 h-3 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '150ms', animationDuration: '1s' }}></div>
                <div className="w-3 h-3 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '300ms', animationDuration: '1s' }}></div>
              </div>
            </div>
            
            {/* Loading text */}
            <div className="mt-4 text-center">
              <p className="text-base text-gray-700 font-medium">Loading available dates...</p>
              <p className="text-sm text-gray-500 mt-1">This will only take a moment</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                className="flex items-center justify-center w-10 h-10 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                onClick={goToPreviousMonth}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h3 className="text-lg font-semibold">
                {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </h3>
              <button
                type="button"
                className="flex items-center justify-center w-10 h-10 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                onClick={goToNextMonth}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-7 gap-2">
              {DAYS.map((day) => (
                <div key={day} className="text-center text-sm font-medium text-gray-600 py-2">
                  {day}
                </div>
              ))}
              {days.map((date, idx) => {
                const available = isDateAvailable(date);
                const year = date?.getFullYear();
                const month = String((date?.getMonth() ?? 0) + 1).padStart(2, '0');
                const day = String(date?.getDate() ?? 0).padStart(2, '0');
                const dateStr = date ? `${year}-${month}-${day}` : '';
                const isSelected = date && selectedDate === dateStr;

                return (
                  <button
                    key={idx}
                    type="button"
                    className={`aspect-square rounded p-2 text-sm ${
                      !date
                        ? "invisible"
                        : isSelected
                        ? "bg-emerald-600 text-white font-semibold"
                        : available
                        ? "border-2 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 cursor-pointer font-medium"
                        : "bg-gray-50 text-gray-400 cursor-not-allowed border border-gray-200"
                    }`}
                    onClick={() => selectDate(date)}
                    disabled={!date || !available}
                  >
                    {date?.getDate()}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Time Slots */}
      {selectedDate && (
        <div id="time-slots-section">
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            Available Times - {(() => {
              const [year, month, day] = selectedDate.split('-').map(Number);
              const date = new Date(year, month - 1, day);
              return date.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                timeZone: actorTimezone || undefined
              });
            })()} ({actorTimezone ? actorTimezone.split('/')[1]?.replace('_', ' ') : 'Local Time'})
          </h3>
          {loadingSlots ? (
            <div className="flex flex-col items-center justify-center py-12">
              {/* Bouncing dots bubble */}
              <div className="bg-gray-200 rounded-2xl px-6 py-4 shadow-sm">
                <div className="flex space-x-2">
                  <div className="w-3 h-3 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1s' }}></div>
                  <div className="w-3 h-3 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '150ms', animationDuration: '1s' }}></div>
                  <div className="w-3 h-3 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '300ms', animationDuration: '1s' }}></div>
                </div>
              </div>
              
              {/* Loading text */}
              <div className="mt-4 text-center">
                <p className="text-base text-gray-700 font-medium">Finding available times...</p>
                <p className="text-sm text-gray-500 mt-1">Checking calendar for conflicts</p>
              </div>
            </div>
          ) : slots.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <svg className="w-12 h-12 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-gray-600 font-medium">No available times</p>
              <p className="text-sm text-gray-500 mt-1">Try selecting a different date</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-60 overflow-y-auto">
              {slots.map((slot, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="relative border-2 border-gray-200 rounded-lg px-4 py-3 text-sm font-medium hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-200 disabled:hover:bg-white disabled:hover:text-gray-900"
                  onClick={() => bookSlot(slot)}
                  disabled={bookingLoading || !actorName || !actorEmail}
                >
                  {formatTime(slot.startMin)}
                  {bookingLoading && (
                    <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-600"></div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
          
          {slots.length > 0 && (!actorName || !actorEmail) && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex">
                <svg className="w-5 h-5 text-amber-400 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-sm text-amber-800 font-medium">Complete your information</p>
                  <p className="text-sm text-amber-700 mt-1">Please fill in your name and email address to book a time slot</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}