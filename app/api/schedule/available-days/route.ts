import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const readerId = searchParams.get("readerId");
    const userId = readerId; // Map for backward compatibility
    const duration = parseInt(searchParams.get("duration") || "30");

    if (!readerId) {
      return NextResponse.json({ ok: false, error: "Missing readerId" }, { status: 400 });
    }

    // Get user with READER role and availability
    const user = await prisma.user.findUnique({
      where: { 
        id: userId || "",
        role: { in: ["READER", "ADMIN"] }
      },
      include: { AvailabilitySlot: true },
    });

    if (!user) {
      return NextResponse.json({ ok: false, error: "Reader not found" }, { status: 404 });
    }

    // Calculate date range (today through maxAdvanceBooking hours)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const maxDate = new Date(today);
    maxDate.setTime(maxDate.getTime() + (user.maxAdvanceBooking || 168) * 60 * 60 * 1000);
    
    console.log('[available-days] today:', today);
    console.log('[available-days] maxDate:', maxDate);
    console.log('[available-days] user.maxAdvanceBooking hours:', user.maxAdvanceBooking);

    // Auto-expire PENDING bookings after 15 minutes
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

    // Get all days within range
    const availableDays: string[] = [];
    const currentDate = new Date(today);

    while (currentDate <= maxDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      
      // Get availability slots for this specific date
      const dayStart = new Date(`${dateStr}T00:00:00.000Z`);
      const dayEnd = new Date(`${dateStr}T23:59:59.999Z`);
      
      const dayAvailability = user.AvailabilitySlot.filter((slot: any) => 
        slot.startTime >= dayStart && slot.startTime <= dayEnd
      );
      
      if (dayAvailability.length > 0) {
        
        // Check if day has existing bookings that would block slots
        // Only consider CONFIRMED bookings or recent PENDING bookings (last 15 min)
        const startOfDay = new Date(dateStr + 'T00:00:00');
        const endOfDay = new Date(dateStr + 'T23:59:59');
        
        const bookings = await prisma.booking.findMany({
          where: {
            readerId,
            startTime: { gte: startOfDay, lte: endOfDay },
            OR: [
              { status: "CONFIRMED" }, // Always block confirmed bookings
              { 
                status: "PENDING",
                createdAt: { gte: fifteenMinutesAgo } // Only block recent PENDING bookings
              }
            ]
          },
          select: { startTime: true, endTime: true, status: true },
        });

        console.log(`[available-days] ${dateStr} has ${bookings.length} active bookings`);

        // Get calendar events for conflict checking (supports Google, Microsoft, iCal)
        const calendarEvents = await getCalendarEvents(user, dateStr);
        
        // Check if any availability slots exist for this date and are available
        let hasAvailableSlot = false;
        const now = new Date();
        const minBookingTime = new Date(now.getTime() + (user.minAdvanceHours || 1) * 60 * 60 * 1000);

        for (const availSlot of dayAvailability) {
          // Check if the slot is on the target date
          const slotDate = availSlot.startTime.toISOString().split('T')[0];
          if (slotDate !== dateStr) continue;
          
          // Check if slot meets minimum advance booking requirement
          if (availSlot.startTime <= minBookingTime) {
            continue;
          }
          
          // Check if slot is already booked
          if (availSlot.isBooked) {
            continue;
          }
          
          // Check if slot conflicts with existing bookings
          const hasBookingConflict = bookings.some((booking: any) => 
            availSlot.startTime < booking.endTime && availSlot.endTime > booking.startTime
          );
          
          if (hasBookingConflict) {
            continue;
          }
          
          // Check if slot conflicts with calendar events
          const hasCalendarConflict = calendarEvents.some(event => {
            const eventStart = new Date(event.start.dateTime || event.start.date);
            const eventEnd = new Date(event.end.dateTime || event.end.date);
            return availSlot.startTime < eventEnd && availSlot.endTime > eventStart;
          });
          
          if (!hasCalendarConflict) {
            hasAvailableSlot = true;
            break;
          }
        }
        
        if (hasAvailableSlot) {
          availableDays.push(dateStr);
          console.log(`[available-days] ✅ ${dateStr} has available slots`);
        } else {
          console.log(`[available-days] ❌ ${dateStr} has no available slots (all blocked)`);
        }
      }
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    console.log(`[available-days] Total available days: ${availableDays.length}`);
    return NextResponse.json({ ok: true, availableDays });
  } catch (err: any) {
    console.error("[available-days] Error:", err);
    return NextResponse.json({ ok: false, error: err.message || "Failed to get available days" }, { status: 500 });
  }
}

// Get calendar events for a specific date to check for conflicts (supports Google, Microsoft, and iCal)
async function getCalendarEvents(user: any, dateStr: string): Promise<any[]> {
  try {
    // Check if user has a calendar connection
    const calendarConnection = await prisma.calendarConnection.findUnique({
      where: { userId: user.id }
    });

    if (!calendarConnection) {
      console.log(`[available-days] No calendar connection for user ${user.id}`);
      return [];
    }

    const provider = calendarConnection.provider;
    
    if (provider === 'GOOGLE') {
      return getGoogleCalendarEvents(user, calendarConnection, dateStr);
    } else if (provider === 'MICROSOFT') {
      return getMicrosoftCalendarEvents(user, calendarConnection, dateStr);
    } else if (provider === 'ICAL') {
      return getICalCalendarEvents(user, calendarConnection, dateStr);
    }
    
    console.log(`[available-days] Unsupported calendar provider: ${provider}`);
    return [];
  } catch (error) {
    console.error('[available-days] Error getting calendar events:', error);
    return [];
  }
}

// Get Google Calendar events for a specific date to check for conflicts
async function getGoogleCalendarEvents(user: any, calendarConnection: any, dateStr: string): Promise<any[]> {
  try {
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
        console.error('[available-days] Token refresh failed:', refreshError);
      }
    }

    // Get events for the specific date
    const startOfDay = `${dateStr}T00:00:00.000Z`;
    const endOfDay = `${dateStr}T23:59:59.999Z`;

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
      
      console.log(`[available-days] Found ${events.length} Google Calendar events for ${dateStr}`);
      
      // Filter out all-day events and events marked as "free" time
      const busyEvents = events.filter((event: any) => {
        if (!event.start.dateTime) return false;
        if (event.transparency === 'transparent') return false;
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
      
      console.log(`[available-days] ${busyEvents.length} busy events after filtering`);
      return busyEvents;
    } else {
      const errorText = await calendarResponse.text();
      console.error('[available-days] Failed to fetch Google Calendar events:', errorText);
      return [];
    }

  } catch (error) {
    console.error('[available-days] Error fetching Google Calendar events:', error);
    return [];
  }
}

// Get Microsoft Calendar events for a specific date to check for conflicts
async function getMicrosoftCalendarEvents(user: any, calendarConnection: any, dateStr: string): Promise<any[]> {
  try {
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
        console.error('[available-days] Microsoft token refresh failed:', refreshError);
      }
    }

    const startOfDay = `${dateStr}T00:00:00.000Z`;
    const endOfDay = `${dateStr}T23:59:59.999Z`;

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
      
      console.log(`[available-days] Found ${events.length} Microsoft Calendar events for ${dateStr}`);
      
      const busyEvents = events.filter((event: any) => {
        if (event.isAllDay) return false;
        if (event.showAs === 'free') return false;
        if (event.isCancelled) return false;
        if (event.responseStatus && event.responseStatus.response === 'declined') return false;
        return true;
      });
      
      const normalizedEvents = busyEvents.map((event: any) => ({
        summary: event.subject,
        start: { dateTime: event.start.dateTime, timeZone: event.start.timeZone },
        end: { dateTime: event.end.dateTime, timeZone: event.end.timeZone }
      }));
      
      console.log(`[available-days] ${normalizedEvents.length} busy Microsoft events after filtering`);
      return normalizedEvents;
    } else {
      const errorText = await calendarResponse.text();
      console.error('[available-days] Failed to fetch Microsoft Calendar events:', errorText);
      return [];
    }

  } catch (error) {
    console.error('[available-days] Error fetching Microsoft Calendar events:', error);
    return [];
  }
}

// Get iCal calendar events for a specific date to check for conflicts
async function getICalCalendarEvents(user: any, calendarConnection: any, dateStr: string): Promise<any[]> {
  try {
    const ICAL = require('ical.js');
    const icalUrl = calendarConnection.accessToken; // URL is stored in accessToken field

    if (!icalUrl) {
      console.log('[available-days] No iCal URL found for user');
      return [];
    }

    console.log('[available-days] Fetching iCal feed from:', icalUrl);

    const response = await fetch(icalUrl, {
      headers: { 'User-Agent': 'Self-Tape-Reader/1.0' },
    });

    if (!response.ok) {
      console.error(`[available-days] Failed to fetch iCal feed (HTTP ${response.status})`);
      return [];
    }

    const icalData = await response.text();
    const jcalData = ICAL.parse(icalData);
    const comp = new ICAL.Component(jcalData);
    const vevents = comp.getAllSubcomponents('vevent');

    console.log(`[available-days] Found ${vevents.length} total events in iCal feed`);

    const dateParts = dateStr.split('-');
    const targetDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
    targetDate.setHours(0, 0, 0, 0);
    
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const events: any[] = [];

    for (const vevent of vevents) {
      const event = new ICAL.Event(vevent);
      
      if (event.startDate.isDate || event.endDate.isDate) continue;

      const eventStart = event.startDate.toJSDate();
      const eventEnd = event.endDate.toJSDate();

      if (eventEnd < targetDate || eventStart >= nextDay) continue;

      const status = vevent.getFirstPropertyValue('status');
      const transp = vevent.getFirstPropertyValue('transp');

      if (status === 'CANCELLED') continue;
      if (transp === 'TRANSPARENT') continue;

      events.push({
        summary: event.summary || '(No title)',
        start: { dateTime: eventStart.toISOString() },
        end: { dateTime: eventEnd.toISOString() },
      });
    }

    console.log(`[available-days] ${events.length} busy iCal events after filtering`);
    return events;

  } catch (error) {
    console.error('[available-days] Error fetching iCal events:', error);
    return [];
  }
}