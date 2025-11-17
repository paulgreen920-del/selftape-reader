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
        
        // Check if day has existing bookings that would block all slots
        const startOfDay = new Date(dateStr + 'T00:00:00');
        const endOfDay = new Date(dateStr + 'T23:59:59');
        
        const bookings = await prisma.booking.findMany({
          where: {
            readerId, // Keep for backward compatibility
            startTime: { gte: startOfDay, lte: endOfDay },
            status: { in: ["PENDING", "CONFIRMED"] },
          },
          select: { startTime: true, endTime: true },
        });

        // Get Google Calendar events for conflict checking
        const calendarEvents = await getGoogleCalendarEvents(user, dateStr);
        
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
          
          // Check if slot conflicts with Google Calendar events
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
        }
      }
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return NextResponse.json({ ok: true, availableDays });
  } catch (err: any) {
    console.error("[available-days] Error:", err);
    return NextResponse.json({ ok: false, error: err.message || "Failed to get available days" }, { status: 500 });
  }
}

// Get Google Calendar events for a specific date to check for conflicts
async function getGoogleCalendarEvents(user: any, dateStr: string): Promise<any[]> {
  try {
    // Check if user has Google Calendar connected
    if (!user.calendarConnection || user.calendarConnection.provider !== 'GOOGLE') {
      console.log(`[available-days] No Google Calendar connection for user ${user.id}`);
      return [];
    }

    const calendarConnection = user.calendarConnection;
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