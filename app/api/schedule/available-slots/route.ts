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

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const readerId = searchParams.get("readerId");
    const date = searchParams.get("date"); // YYYY-MM-DD
    const durationMin = parseInt(searchParams.get("duration") || "30");

    if (!readerId || !date) {
      return NextResponse.json({ ok: false, error: "Missing readerId or date" }, { status: 400 });
    }

    // Get reader with availability slots
    const reader = await prisma.user.findUnique({
      where: { 
        id: readerId,
        role: { in: ["READER", "ADMIN"] }
      },
      select: {
        id: true,
        maxAdvanceBooking: true,
        minAdvanceHours: true,
        AvailabilitySlot: {
          where: {
            startTime: {
              gte: new Date(`${date}T00:00:00.000Z`),
              lt: new Date(`${date}T23:59:59.999Z`)
            }
          }
        }
      }
    });

    if (!reader) {
      return NextResponse.json({ ok: false, error: "Reader not found" }, { status: 404 });
    }

    // Check if date is within booking window
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const selectedDate = new Date(date + 'T00:00:00');
    selectedDate.setHours(0, 0, 0, 0);
    
    const maxDate = new Date(today);
    maxDate.setTime(maxDate.getTime() + (reader.maxAdvanceBooking || 168) * 60 * 60 * 1000);

    if (selectedDate < today || selectedDate > maxDate) {
      return NextResponse.json({ ok: true, slots: [] });
    }

    // Check if reader has availability slots for this date
    if (reader.AvailabilitySlot.length === 0) {
      return NextResponse.json({ ok: true, slots: [] });
    }

    // Generate time slots from availability by finding consecutive available periods
    const slots: Array<{ startMin: number; endMin: number; startTime: string; endTime: string }> = [];
    const now = new Date();
    const minBookingTime = new Date(now.getTime() + (reader.minAdvanceHours || 2) * 60 * 60 * 1000);

    // Sort availability slots by start time
    const validSlots = reader.AvailabilitySlot
      .filter((slot: any) => !slot.isBooked && slot.startTime > minBookingTime)
      .sort((a: any, b: any) => a.startTime.getTime() - b.startTime.getTime());

    if (validSlots.length === 0) {
      return NextResponse.json({ ok: true, slots: [] });
    }

    // Convert to minutes from start of day for easier processing
    const slotMinutes = validSlots.map((slot: any) => {
      const start = new Date(slot.startTime);
      const end = new Date(slot.endTime);
      return {
        startMin: start.getHours() * 60 + start.getMinutes(),
        endMin: end.getHours() * 60 + end.getMinutes(),
        originalSlot: slot
      };
    });

    // Find consecutive periods and generate booking slots
    let i = 0;
    while (i < slotMinutes.length) {
      let periodStart = slotMinutes[i].startMin;
      let periodEnd = slotMinutes[i].endMin;
      
      // Extend period by finding consecutive slots
      let j = i + 1;
      while (j < slotMinutes.length && slotMinutes[j].startMin === periodEnd) {
        periodEnd = slotMinutes[j].endMin;
        j++;
      }
      
      // Generate booking slots within this consecutive period
      let currentMin = periodStart;
      while (currentMin + durationMin <= periodEnd) {
        const slotStart = currentMin;
        const slotEnd = currentMin + durationMin;

        // Build full date-time strings as local dates
        const [year, month, day] = date.split('-').map(Number);
        const slotStartTime = new Date(year, month - 1, day, Math.floor(slotStart / 60), slotStart % 60);
        const slotEndTime = new Date(year, month - 1, day, Math.floor(slotEnd / 60), slotEnd % 60);

        slots.push({
          startMin: slotStart,
          endMin: slotEnd,
          startTime: slotStartTime.toISOString(),
          endTime: slotEndTime.toISOString(),
        });

        // Move to next potential slot - use appropriate increments based on duration
        const increment = durationMin === 15 ? 15 : 30;
        currentMin += increment;
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
          gte: new Date(`${date}T00:00:00.000Z`),
          lt: new Date(`${date}T23:59:59.999Z`)
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
    
    const calendarEvents = await getCalendarEvents(readerWithCalendar, date);

    // Filter out slots that conflict with existing bookings or calendar events
    const availableSlots = slots.filter((slot) => {
      const slotStart = new Date(slot.startTime);
      const slotEnd = new Date(slot.endTime);

      // Check booking conflicts
      const hasBookingConflict = existingBookings.some((booking: any) => {
        return slotStart < booking.endTime && slotEnd > booking.startTime;
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
async function getCalendarEvents(user: any, dateStr: string): Promise<any[]> {
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
    events = await getGoogleCalendarEvents(user, dateStr);
  } else if (provider === 'MICROSOFT') {
    events = await getMicrosoftCalendarEvents(user, dateStr);
  } else if (provider === 'ICAL') {
    events = await getICalCalendarEvents(user, dateStr);
  }
  
  // Cache the results
  setCachedCalendarEvents(cacheKey, events);
  
  return events;
}

// Get Google Calendar events - OPTIMIZED
async function getGoogleCalendarEvents(user: any, dateStr: string): Promise<any[]> {
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

    // Parse target date and add small buffer for timezone safety
    const dateParts = dateStr.split('-');
    const targetDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
    
    // Start of day in UTC
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    // End of day in UTC
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    const timeMin = startOfDay.toISOString();
    const timeMax = endOfDay.toISOString();

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

// Get Microsoft Calendar events - OPTIMIZED
async function getMicrosoftCalendarEvents(user: any, dateStr: string): Promise<any[]> {
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

    // Parse target date
    const dateParts = dateStr.split('-');
    const targetDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
    
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    const startDateTime = startOfDay.toISOString();
    const endDateTime = endOfDay.toISOString();

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

// Get iCal calendar events - OPTIMIZED
async function getICalCalendarEvents(user: any, dateStr: string): Promise<any[]> {
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

    // Parse target date
    const dateParts = dateStr.split('-');
    const targetDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
    
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const events: any[] = [];

    for (const vevent of vevents) {
      const event = new ICAL.Event(vevent);
      
      // Skip all-day events
      if (event.startDate.isDate || event.endDate.isDate) continue;

      const eventStart = event.startDate.toJSDate();
      const eventEnd = event.endDate.toJSDate();

      // Check if event is on target date
      if (eventEnd < startOfDay || eventStart > endOfDay) continue;

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