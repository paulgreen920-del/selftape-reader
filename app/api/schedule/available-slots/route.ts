import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Simple in-memory cache for calendar events (5-minute TTL)
const calendarCache = new Map<string, { events: any[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCachedCalendarEvents(cacheKey: string): any[] | null {
  const cached = calendarCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.events;
  }
  return null;
}

function setCachedCalendarEvents(cacheKey: string, events: any[]): void {
  calendarCache.set(cacheKey, { events, timestamp: Date.now() });
  
  // Clean up old cache entries (older than 10 minutes)
  for (const [key, value] of calendarCache.entries()) {
    if (Date.now() - value.timestamp > 10 * 60 * 1000) {
      calendarCache.delete(key);
    }
  }
}

// Helper to get start and end of a day in a specific timezone as UTC Date objects
function getDayBoundsInTimezone(dateStr: string, timezone: string): { startUTC: Date; endUTC: Date } {
  // Parse the date string
  const [year, month, day] = dateStr.split('-').map(Number);
  
  // Create formatter to get timezone offset
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  
  // Start of day: midnight in the target timezone
  // Create a date at midnight UTC
  const midnightUTC = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  
  // Get what midnight UTC looks like in target timezone
  const parts = formatter.formatToParts(midnightUTC);
  const getPart = (type: string) => parts.find(p => p.type === type)?.value || '0';
  const tzHour = parseInt(getPart('hour'));
  const tzDay = parseInt(getPart('day'));
  
  // Calculate offset: if timezone shows different time than UTC, that's the offset
  let offsetMinutes = tzHour * 60 - 0; // midnight UTC = 0 minutes
  if (tzDay > day) {
    offsetMinutes += 24 * 60;
  } else if (tzDay < day) {
    offsetMinutes -= 24 * 60;
  }
  
  // Start of day in timezone = midnight in timezone = midnight UTC minus offset
  const startUTC = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  startUTC.setUTCMinutes(startUTC.getUTCMinutes() - offsetMinutes);
  
  // End of day = start + 24 hours
  const endUTC = new Date(startUTC.getTime() + 24 * 60 * 60 * 1000);
  
  return { startUTC, endUTC };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const readerId = searchParams.get("readerId");
    const date = searchParams.get("date"); // YYYY-MM-DD (in actor's perspective)
    const durationMin = parseInt(searchParams.get("duration") || "30");
    const actorTimezone = searchParams.get("timezone") || "America/New_York";

    if (!readerId || !date) {
      return NextResponse.json({ ok: false, error: "Missing readerId or date" }, { status: 400 });
    }

    // Get reader with timezone info
    const reader = await prisma.user.findUnique({
      where: { 
        id: readerId,
        role: { in: ["READER", "ADMIN"] }
      },
      select: {
        id: true,
        timezone: true,
        maxAdvanceBooking: true,
        minAdvanceHours: true,
      }
    });

    if (!reader) {
      return NextResponse.json({ ok: false, error: "Reader not found" }, { status: 404 });
    }

    const readerTimezone = reader.timezone || "America/New_York";

    // Check if date is within booking window (using reader's timezone for consistency)
    const now = new Date();
    const { startUTC: dayStartUTC, endUTC: dayEndUTC } = getDayBoundsInTimezone(date, readerTimezone);
    
    // Get today's start in reader's timezone
    const todayFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: readerTimezone,
      year: 'numeric',
      month: '2-digit', 
      day: '2-digit',
    });
    const todayStr = todayFormatter.format(now);
    const { startUTC: todayStartUTC } = getDayBoundsInTimezone(todayStr, readerTimezone);
    
    // Calculate max booking date
    const maxBookingMs = (reader.maxAdvanceBooking || 168) * 60 * 60 * 1000;
    const maxDate = new Date(now.getTime() + maxBookingMs);

    if (dayStartUTC < todayStartUTC || dayStartUTC > maxDate) {
      return NextResponse.json({ ok: true, slots: [] });
    }

    // Query availability slots for this date range (slots are stored in UTC)
    const availabilitySlots = await prisma.availabilitySlot.findMany({
      where: {
        userId: readerId,
        startTime: {
          gte: dayStartUTC,
          lt: dayEndUTC
        }
      }
    });

    if (availabilitySlots.length === 0) {
      return NextResponse.json({ ok: true, slots: [] });
    }

    // Generate time slots from availability
    const slots: Array<{ startMin: number; endMin: number; startTime: string; endTime: string }> = [];
    const minBookingTime = new Date(now.getTime() + (reader.minAdvanceHours || 2) * 60 * 60 * 1000);

    // Filter and sort availability slots
    const validSlots = availabilitySlots
      .filter((slot: any) => !slot.isBooked && new Date(slot.startTime) > minBookingTime)
      .sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    if (validSlots.length === 0) {
      return NextResponse.json({ ok: true, slots: [] });
    }

    // Convert UTC slots to actor's local time for display
    // startMin/endMin represent minutes from midnight in ACTOR's timezone
    const slotMinutes = validSlots.map((slot: any) => {
      const startUTC = new Date(slot.startTime);
      const endUTC = new Date(slot.endTime);
      
      // Convert to actor's timezone
      const startInActorTZ = new Date(startUTC.toLocaleString('en-US', { timeZone: actorTimezone }));
      const endInActorTZ = new Date(endUTC.toLocaleString('en-US', { timeZone: actorTimezone }));
      
      // Get hours and minutes in actor's timezone
      const startHour = startInActorTZ.getHours();
      const startMinute = startInActorTZ.getMinutes();
      const endHour = endInActorTZ.getHours();
      const endMinute = endInActorTZ.getMinutes();
      
      return {
        startMin: startHour * 60 + startMinute,
        endMin: endHour * 60 + endMinute,
        startTimeUTC: startUTC,
        endTimeUTC: endUTC,
        originalSlot: slot
      };
    });

    // Find consecutive periods and generate booking slots
    let i = 0;
    while (i < slotMinutes.length) {
      let periodStart = slotMinutes[i].startMin;
      let periodEnd = slotMinutes[i].endMin;
      let periodStartUTC = slotMinutes[i].startTimeUTC;
      
      // Extend period by finding consecutive slots
      let j = i + 1;
      while (j < slotMinutes.length && slotMinutes[j].startMin === periodEnd) {
        periodEnd = slotMinutes[j].endMin;
        j++;
      }
      
      // Generate booking slots within this consecutive period
      let currentMin = periodStart;
      let currentUTC = new Date(periodStartUTC);
      
      while (currentMin + durationMin <= periodEnd) {
        const slotStart = currentMin;
        const slotEnd = currentMin + durationMin;
        
        const slotStartUTC = new Date(currentUTC);
        const slotEndUTC = new Date(currentUTC.getTime() + durationMin * 60 * 1000);

        slots.push({
          startMin: slotStart,
          endMin: slotEnd,
          startTime: slotStartUTC.toISOString(),
          endTime: slotEndUTC.toISOString(),
        });

        // Move to next potential slot
        const increment = durationMin === 15 ? 15 : 30;
        currentMin += increment;
        currentUTC = new Date(currentUTC.getTime() + increment * 60 * 1000);
      }
      
      // Move to next non-consecutive period
      i = j;
    }

    // Get existing bookings for this date to filter out conflicts
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    
    const existingBookings = await prisma.booking.findMany({
      where: {
        readerId,
        startTime: {
          gte: dayStartUTC,
          lt: dayEndUTC
        },
        OR: [
          { status: "CONFIRMED" },
          { 
            status: "PENDING",
            createdAt: { gte: fifteenMinutesAgo }
          }
        ]
      },
      select: {
        startTime: true,
        endTime: true,
      },
    });

    // Get calendar events for conflict checking
    const readerWithCalendar = await prisma.user.findUnique({
      where: { id: readerId },
      include: { CalendarConnection: true }
    });
    
    const calendarEvents = await getCalendarEvents(readerWithCalendar, date, readerTimezone);

    // Filter out slots that conflict with existing bookings or calendar events
    const availableSlots = slots.filter((slot) => {
      const slotStart = new Date(slot.startTime);
      const slotEnd = new Date(slot.endTime);

      // Check booking conflicts
      const hasBookingConflict = existingBookings.some((booking: any) => {
        const bookingStart = new Date(booking.startTime);
        const bookingEnd = new Date(booking.endTime);
        return slotStart < bookingEnd && slotEnd > bookingStart;
      });

      if (hasBookingConflict) return false;

      // Check calendar conflicts
      const hasCalendarConflict = calendarEvents.some((event: any) => {
        const eventStart = new Date(event.start.dateTime || event.start.date);
        const eventEnd = new Date(event.end.dateTime || event.end.date);
        return slotStart < eventEnd && slotEnd > eventStart;
      });

      return !hasCalendarConflict;
    });

    return NextResponse.json({ ok: true, slots: availableSlots });
  } catch (err: any) {
    console.error("[available-slots] Error:", err);
    return NextResponse.json({ ok: false, error: err.message || "Failed to get slots" }, { status: 500 });
  }
}

// Get calendar events for a specific date to check for conflicts
async function getCalendarEvents(user: any, dateStr: string, readerTimezone: string): Promise<any[]> {
  if (!user?.CalendarConnection) {
    return [];
  }

  // Check cache first
  const cacheKey = `${user.id}-${dateStr}-${user.CalendarConnection.provider}`;
  const cachedEvents = getCachedCalendarEvents(cacheKey);
  if (cachedEvents !== null) {
    return cachedEvents;
  }

  const provider = user.CalendarConnection.provider;
  let events: any[] = [];
  
  if (provider === 'GOOGLE') {
    events = await getGoogleCalendarEvents(user, dateStr, readerTimezone);
  } else if (provider === 'MICROSOFT') {
    events = await getMicrosoftCalendarEvents(user, dateStr, readerTimezone);
  } else if (provider === 'ICAL') {
    events = await getICalCalendarEvents(user, dateStr, readerTimezone);
  }
  
  // Cache the results
  setCachedCalendarEvents(cacheKey, events);
  
  return events;
}

// Get Google Calendar events
async function getGoogleCalendarEvents(user: any, dateStr: string, readerTimezone: string): Promise<any[]> {
  try {
    const calendarConnection = user.CalendarConnection;
    let accessToken = calendarConnection.accessToken;

    // Refresh access token if needed
    if (calendarConnection.refreshToken) {
      try {
        const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID!,
            client_secret: process.env.GOOGLE_CLIENT_SECRET!,
            refresh_token: calendarConnection.refreshToken,
            grant_type: 'refresh_token',
          }),
        });

        if (refreshResponse.ok) {
          const tokenData = await refreshResponse.json();
          accessToken = tokenData.access_token;
          
          await prisma.calendarConnection.update({
            where: { id: calendarConnection.id },
            data: { accessToken: tokenData.access_token }
          });
        }
      } catch (refreshError) {
        console.error('[calendar] Token refresh failed:', refreshError);
      }
    }

    // Get day bounds in reader's timezone
    const { startUTC, endUTC } = getDayBoundsInTimezone(dateStr, readerTimezone);
    
    const timeMin = startUTC.toISOString();
    const timeMax = endUTC.toISOString();

    const calendarResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
      `timeMin=${encodeURIComponent(timeMin)}&` +
      `timeMax=${encodeURIComponent(timeMax)}&` +
      `singleEvents=true&` +
      `orderBy=startTime`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (calendarResponse.ok) {
      const data = await calendarResponse.json();
      const events = data.items || [];
      
      // Filter out all-day events and "free" time
      const busyEvents = events.filter((event: any) => {
        if (!event.start.dateTime) return false;
        if (event.transparency === 'transparent') return false;
        
        if (event.attendees) {
          const userAttendee = event.attendees.find((a: any) => a.email === user.email);
          if (userAttendee && userAttendee.responseStatus === 'declined') return false;
        }
        
        return true;
      });
      
      return busyEvents;
    } else {
      console.error(`[calendar] Google fetch failed: ${calendarResponse.status}`);
      return [];
    }

  } catch (error) {
    console.error('[calendar] Google error:', error);
    return [];
  }
}

// Get Microsoft Calendar events
async function getMicrosoftCalendarEvents(user: any, dateStr: string, readerTimezone: string): Promise<any[]> {
  try {
    const calendarConnection = user.CalendarConnection;
    let accessToken = calendarConnection.accessToken;

    // Refresh access token if needed
    if (calendarConnection.refreshToken) {
      try {
        const refreshResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: process.env.MS_CLIENT_ID!,
            client_secret: process.env.MS_CLIENT_SECRET!,
            refresh_token: calendarConnection.refreshToken,
            grant_type: 'refresh_token',
          }),
        });

        if (refreshResponse.ok) {
          const tokenData = await refreshResponse.json();
          accessToken = tokenData.access_token;
          
          await prisma.calendarConnection.update({
            where: { id: calendarConnection.id },
            data: { accessToken: tokenData.access_token }
          });
        }
      } catch (refreshError) {
        console.error('[calendar] MS token refresh failed:', refreshError);
      }
    }

    // Get day bounds in reader's timezone
    const { startUTC, endUTC } = getDayBoundsInTimezone(dateStr, readerTimezone);
    
    const startDateTime = startUTC.toISOString();
    const endDateTime = endUTC.toISOString();

    const calendarResponse = await fetch(
      `https://graph.microsoft.com/v1.0/me/calendarview?` +
      `startDateTime=${encodeURIComponent(startDateTime)}&` +
      `endDateTime=${encodeURIComponent(endDateTime)}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Prefer': 'outlook.timezone="UTC"'
        },
      }
    );

    if (calendarResponse.ok) {
      const data = await calendarResponse.json();
      const events = data.value || [];
      
      // Filter out all-day and free events
      const busyEvents = events.filter((event: any) => {
        if (event.isAllDay) return false;
        if (event.showAs === 'free') return false;
        if (event.isCancelled) return false;
        if (event.responseStatus && event.responseStatus.response === 'declined') return false;
        return true;
      });
      
      // Normalize to standard format
      const normalizedEvents = busyEvents.map((event: any) => ({
        summary: event.subject,
        start: {
          dateTime: event.start.dateTime,
          timeZone: event.start.timeZone
        },
        end: {
          dateTime: event.end.dateTime,
          timeZone: event.end.timeZone
        }
      }));
      
      return normalizedEvents;
    } else {
      console.error(`[calendar] MS fetch failed: ${calendarResponse.status}`);
      return [];
    }

  } catch (error) {
    console.error('[calendar] MS error:', error);
    return [];
  }
}

// Get iCal calendar events
async function getICalCalendarEvents(user: any, dateStr: string, readerTimezone: string): Promise<any[]> {
  try {
    const ICAL = require('ical.js');
    const calendarConnection = user.CalendarConnection;
    const icalUrl = calendarConnection.accessToken;

    if (!icalUrl) {
      return [];
    }

    const response = await fetch(icalUrl, {
      headers: { 'User-Agent': 'Self-Tape-Reader/1.0' },
    });

    if (!response.ok) {
      return [];
    }

    const icalData = await response.text();
    const jcalData = ICAL.parse(icalData);
    const comp = new ICAL.Component(jcalData);
    const vevents = comp.getAllSubcomponents('vevent');

    // Get day bounds in reader's timezone
    const { startUTC, endUTC } = getDayBoundsInTimezone(dateStr, readerTimezone);

    const events: any[] = [];

    for (const vevent of vevents) {
      const event = new ICAL.Event(vevent);
      
      // Skip all-day events
      if (event.startDate.isDate || event.endDate.isDate) continue;

      const eventStart = event.startDate.toJSDate();
      const eventEnd = event.endDate.toJSDate();

      // Check if event overlaps with target date
      if (eventEnd <= startUTC || eventStart >= endUTC) continue;

      // Get event status and transparency
      const status = vevent.getFirstPropertyValue('status');
      const transp = vevent.getFirstPropertyValue('transp');

      // Skip cancelled or free events
      if (status === 'CANCELLED') continue;
      if (transp === 'TRANSPARENT') continue;

      events.push({
        summary: event.summary || '(No title)',
        start: { dateTime: eventStart.toISOString() },
        end: { dateTime: eventEnd.toISOString() },
      });
    }

    return events;

  } catch (error) {
    console.error('[calendar] iCal error:', error);
    return [];
  }
}