// Test webhook trigger for development
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { bookingId } = await req.json();
    
    if (!bookingId) {
      return NextResponse.json({ error: "bookingId required" }, { status: 400 });
    }
    
    console.log(`[dev-webhook] Simulating payment completion for booking ${bookingId}`);
    
    // Get the booking with reader and actor info
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        User_Booking_readerIdToUser: {
          select: {
            id: true,
            name: true,
            displayName: true,
            email: true,
            timezone: true,
            CalendarConnection: true
          }
        },
        User_Booking_actorIdToUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }
    
    // Update booking to CONFIRMED (simulate successful payment)
    await prisma.booking.update({
      where: { id: bookingId },
      data: { status: "CONFIRMED" }
    });
    
    console.log(`[dev-webhook] Updated booking status to CONFIRMED`);
    
    // Create Google Calendar event if reader has calendar connected
    if (booking.User_Booking_readerIdToUser.CalendarConnection?.provider === 'GOOGLE') {
      await createGoogleCalendarEvent(booking);
    } else {
      console.log(`[dev-webhook] No Google Calendar connection for reader`);
    }
    
    return NextResponse.json({ 
      ok: true, 
      message: "Webhook simulated successfully",
      bookingId: bookingId,
      status: "CONFIRMED"
    });
    
  } catch (error: any) {
    console.error("[dev-webhook] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Create Google Calendar Event (copied from webhook)
async function createGoogleCalendarEvent(booking: any) {
  try {
    const reader = booking.reader;
    const actor = booking.actor;
    const calendarConnection = reader.calendarConnection;

    console.log(`[dev-webhook] Creating Google Calendar event for reader ${reader.id}`);

    // Refresh access token if needed
    let accessToken = calendarConnection.accessToken;
    
    if (calendarConnection.refreshToken) {
      try {
        const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
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
          
          console.log(`[dev-webhook] Refreshed access token`);
        }
      } catch (refreshError) {
        console.error('[dev-webhook] Token refresh failed:', refreshError);
      }
    }

    // Format event data
    const startTime = new Date(booking.startTime);
    const endTime = new Date(booking.endTime);
    const readerTimezone = reader.timezone || 'America/New_York';

    const eventData = {
      summary: `Reading Session with ${actor.name}`,
      description: `Self-tape reading session.\n\nActor: ${actor.name}\nEmail: ${actor.email}\n\nMeeting URL: ${booking.meetingUrl || 'TBD'}`,
      start: {
        dateTime: startTime.toISOString(),
        timeZone: readerTimezone,
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: readerTimezone,
      },
      attendees: [
        {
          email: reader.email,
          displayName: reader.displayName || reader.name,
          responseStatus: 'accepted'
        },
        {
          email: actor.email,
          displayName: actor.name,
          responseStatus: 'needsAction'
        }
      ],
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 60 },
          { method: 'popup', minutes: 15 }
        ]
      }
    };

    // Create calendar event
    const calendarResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      }
    );

    if (calendarResponse.ok) {
      const event = await calendarResponse.json();
      console.log(`[dev-webhook] ✅ Created event ${event.id} for booking ${booking.id}`);
      console.log(`[dev-webhook] Event URL: ${event.htmlLink}`);
      
      // Store calendar event ID in booking
      await prisma.booking.update({
        where: { id: booking.id },
        data: { 
          notes: JSON.stringify({ calendarEventId: event.id })
        }
      });
      
      return { success: true, eventId: event.id, eventUrl: event.htmlLink };
      
    } else {
      const errorText = await calendarResponse.text();
      console.error(`[dev-webhook] Failed to create event:`, errorText);
      return { success: false, error: errorText };
    }

  } catch (error: any) {
    console.error('[dev-webhook] Error creating event:', error);
    return { success: false, error: error.message };
  }
}