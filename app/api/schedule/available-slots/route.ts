import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
        // For 15-minute slots, use 15-minute increments; for longer slots, use 30-minute increments
        const increment = durationMin === 15 ? 15 : 30;
        currentMin += increment;
      }
      
      // Move to next non-consecutive period
      i = j;
    }

    // Get existing bookings for this date to filter out conflicts
    const existingBookings = await prisma.booking.findMany({
      where: {
        readerId,
        startTime: {
          gte: new Date(`${date}T00:00:00.000Z`),
          lt: new Date(`${date}T23:59:59.999Z`)
        },
        status: { in: ["PENDING", "CONFIRMED"] },
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
    
    console.log(`[available-slots] Reader ${readerId} calendar check:`, {
      hasConnection: !!readerWithCalendar?.CalendarConnection,
      provider: readerWithCalendar?.CalendarConnection?.provider
    });
    
    const calendarEvents = await getCalendarEvents(readerWithCalendar, date);
    console.log(`[available-slots] Found ${calendarEvents.length} calendar events for ${date}`);

    // Filter out slots that conflict with existing bookings or calendar events
    let filteredCount = 0;
    const availableSlots = slots.filter((slot) => {
      const slotStart = new Date(slot.startTime);
      const slotEnd = new Date(slot.endTime);

      // Check booking conflicts
      const hasBookingConflict = existingBookings.some((booking: any) => {
        return slotStart < booking.endTime && slotEnd > booking.startTime;
      });

      if (hasBookingConflict) {
        filteredCount++;
        console.log(`[available-slots] Filtered slot ${slot.startTime} - booking conflict`);
        return false;
      }

      // Check Google Calendar conflicts
      const hasCalendarConflict = calendarEvents.some((event: any) => {
        const eventStart = new Date(event.start.dateTime || event.start.date);
        const eventEnd = new Date(event.end.dateTime || event.end.date);
        const conflicts = slotStart < eventEnd && slotEnd > eventStart;
        if (conflicts) {
          console.log(`[available-slots] ❌ CONFLICT: Slot ${slotStart.toISOString()} to ${slotEnd.toISOString()} conflicts with "${event.summary}" (${eventStart.toISOString()} to ${eventEnd.toISOString()})`);
        }
        return conflicts;
      });

      if (hasCalendarConflict) {
        filteredCount++;
      }

      return !hasCalendarConflict;
    });

    console.log(`[available-slots] Filtered ${filteredCount} slots due to conflicts, ${availableSlots.length} remain`);

    return NextResponse.json({ ok: true, slots: availableSlots });
  } catch (err: any) {
    console.error("[available-slots] Error:", err);
    return NextResponse.json({ ok: false, error: err.message || "Failed to get slots" }, { status: 500 });
  }
}

// Get calendar events for a specific date to check for conflicts (supports Google, Microsoft, and iCal)
async function getCalendarEvents(user: any, dateStr: string): Promise<any[]> {
  if (!user?.CalendarConnection) {
    console.log(`[available-slots] No calendar connection for user ${user?.id}`);
    return [];
  }

  const provider = user.CalendarConnection.provider;
  
  if (provider === 'GOOGLE') {
    return getGoogleCalendarEvents(user, dateStr);
  } else if (provider === 'MICROSOFT') {
    return getMicrosoftCalendarEvents(user, dateStr);
  } else if (provider === 'ICAL') {
    return getICalCalendarEvents(user, dateStr);
  }
  
  console.log(`[available-slots] Unsupported calendar provider: ${provider}`);
  return [];
}

// Get Google Calendar events for a specific date to check for conflicts
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
          
          // Update stored access token
          await prisma.calendarConnection.update({
            where: { id: calendarConnection.id },
            data: { accessToken: tokenData.access_token }
          });
        }
      } catch (refreshError) {
        console.error('[available-slots] Google token refresh failed:', refreshError);
      }
    }

    // Get events for the specific date
    // Use a wider range to account for timezone differences
    // Fetch events from the day before to the day after in UTC to ensure we catch all events
    const dateParts = dateStr.split('-');
    const targetDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
    
    const dayBefore = new Date(targetDate);
    dayBefore.setDate(dayBefore.getDate() - 1);
    const dayAfter = new Date(targetDate);
    dayAfter.setDate(dayAfter.getDate() + 2);
    
    const startOfDay = dayBefore.toISOString().split('T')[0] + 'T00:00:00Z';
    const endOfDay = dayAfter.toISOString().split('T')[0] + 'T23:59:59Z';

    const calendarResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
      `timeMin=${encodeURIComponent(startOfDay)}&` +
      `timeMax=${encodeURIComponent(endOfDay)}&` +
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
      
      console.log(`[available-slots] Found ${events.length} Google Calendar events for ${dateStr}`);
      
      // Filter out all-day events and events marked as "free" time
      const busyEvents = events.filter((event: any) => {
        // Skip all-day events (they don't have dateTime, just date)
        if (!event.start.dateTime) return false;
        
        // Skip events where the user is marked as "free" (transparency: 'transparent')
        if (event.transparency === 'transparent') return false;
        
        // Skip declined events
        if (event.attendees) {
          const userAttendee = event.attendees.find((attendee: any) => 
            attendee.email === user.email
          );
          if (userAttendee && userAttendee.responseStatus === 'declined') {
            return false;
          }
        }
        
        return true;
      });
      
      console.log(`[available-slots] ${busyEvents.length} busy events after filtering`);
      return busyEvents;
    } else {
      const errorText = await calendarResponse.text();
      console.error('[available-slots] Failed to fetch Google Calendar events (status: ${calendarResponse.status}):', errorText);
      
      // If unauthorized (401), the token might be permanently invalid
      if (calendarResponse.status === 401) {
        console.log('[available-slots] Calendar access token invalid - user should reconnect calendar');
      }
      return [];
    }

  } catch (error) {
    console.error('[available-slots] Error fetching Google Calendar events:', error);
    return [];
  }
}

// Get Microsoft Calendar events for a specific date to check for conflicts
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
          
          // Update stored access token
          await prisma.calendarConnection.update({
            where: { id: calendarConnection.id },
            data: { accessToken: tokenData.access_token }
          });
        }
      } catch (refreshError) {
        console.error('[available-slots] Microsoft token refresh failed:', refreshError);
      }
    }

    // Get events for the specific date with wider range for timezone handling
    const dateParts = dateStr.split('-');
    const targetDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
    
    const dayBefore = new Date(targetDate);
    dayBefore.setDate(dayBefore.getDate() - 1);
    const dayAfter = new Date(targetDate);
    dayAfter.setDate(dayAfter.getDate() + 2);
    
    const startOfDay = dayBefore.toISOString();
    const endOfDay = dayAfter.toISOString();

    const calendarResponse = await fetch(
      `https://graph.microsoft.com/v1.0/me/calendarview?` +
      `startDateTime=${encodeURIComponent(startOfDay)}&` +
      `endDateTime=${encodeURIComponent(endOfDay)}`,
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
      
      console.log(`[available-slots] Found ${events.length} Microsoft Calendar events for ${dateStr}`);
      
      // Filter out all-day events and events marked as "free" time
      const busyEvents = events.filter((event: any) => {
        // Skip all-day events
        if (event.isAllDay) return false;
        
        // Skip events marked as "free" time
        if (event.showAs === 'free') return false;
        
        // Skip cancelled events
        if (event.isCancelled) return false;
        
        // Skip declined events
        if (event.responseStatus && event.responseStatus.response === 'declined') {
          return false;
        }
        
        return true;
      });
      
      // Convert Microsoft event format to Google-like format for consistent handling
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
      
      console.log(`[available-slots] ${normalizedEvents.length} busy Microsoft events after filtering`);
      return normalizedEvents;
    } else {
      const errorText = await calendarResponse.text();
      console.error('[available-slots] Failed to fetch Microsoft Calendar events (status: ${calendarResponse.status}):', errorText);
      
      // If unauthorized (401), the token might be permanently invalid
      if (calendarResponse.status === 401) {
        console.log('[available-slots] Calendar access token invalid - user should reconnect calendar');
      }
      return [];
    }

  } catch (error) {
    console.error('[available-slots] Error fetching Microsoft Calendar events:', error);
    return [];
  }
}

// Get iCal calendar events for a specific date to check for conflicts
async function getICalCalendarEvents(user: any, dateStr: string): Promise<any[]> {
  try {
    const ICAL = require('ical.js');
    const calendarConnection = user.CalendarConnection;
    const icalUrl = calendarConnection.accessToken; // URL is stored in accessToken field

    if (!icalUrl) {
      console.log('[available-slots] No iCal URL found for user');
      return [];
    }

    console.log('[available-slots] Fetching iCal feed from:', icalUrl);

    // Fetch the iCal feed
    const response = await fetch(icalUrl, {
      headers: {
        'User-Agent': 'Self-Tape-Reader/1.0',
      },
    });

    if (!response.ok) {
      console.error(`[available-slots] Failed to fetch iCal feed (HTTP ${response.status})`);
      return [];
    }

    const icalData = await response.text();

    // Parse the iCal data
    const jcalData = ICAL.parse(icalData);
    const comp = new ICAL.Component(jcalData);
    const vevents = comp.getAllSubcomponents('vevent');

    console.log(`[available-slots] Found ${vevents.length} total events in iCal feed`);

    // Filter events for the target date range (with timezone buffer)
    const dateParts = dateStr.split('-');
    const targetDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
    
    const dayBefore = new Date(targetDate);
    dayBefore.setDate(dayBefore.getDate() - 1);
    const dayAfter = new Date(targetDate);
    dayAfter.setDate(dayAfter.getDate() + 2);

    const events: any[] = [];

    for (const vevent of vevents) {
      const event = new ICAL.Event(vevent);
      
      // Skip all-day events
      if (event.startDate.isDate || event.endDate.isDate) {
        continue;
      }

      const eventStart = event.startDate.toJSDate();
      const eventEnd = event.endDate.toJSDate();

      // Check if event falls within our date range
      if (eventEnd < dayBefore || eventStart > dayAfter) {
        continue;
      }

      // Get event status and transparency
      const status = vevent.getFirstPropertyValue('status');
      const transp = vevent.getFirstPropertyValue('transp');

      // Skip cancelled events
      if (status === 'CANCELLED') {
        continue;
      }

      // Skip events marked as "free" time
      if (transp === 'TRANSPARENT') {
        continue;
      }

      events.push({
        summary: event.summary || '(No title)',
        start: {
          dateTime: eventStart.toISOString(),
        },
        end: {
          dateTime: eventEnd.toISOString(),
        },
      });
    }

    console.log(`[available-slots] ${events.length} busy iCal events after filtering`);
    return events;

  } catch (error) {
    console.error('[available-slots] Error fetching iCal events:', error);
    return [];
  }
}