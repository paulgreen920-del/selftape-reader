// lib/calendar-sync.ts
// Functions to create calendar events in Google/Microsoft calendars

import { prisma } from './prisma';

interface CalendarEventData {
  bookingId: string;
  summary: string;
  description: string;
  startTime: Date;
  endTime: Date;
  attendees?: string[];
  meetingUrl?: string;
}

export async function createCalendarEventForBooking(
  userId: string,
  eventData: CalendarEventData
): Promise<{ success: boolean; error?: string; eventId?: string }> {
  try {
    // Get user's calendar connection
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { CalendarConnection: true }
    });

    if (!user?.CalendarConnection) {
      console.log(`[calendar-sync] No calendar connection for user ${userId}`);
      return { success: false, error: 'No calendar connected' };
    }

    const provider = user.CalendarConnection.provider;

    if (provider === 'GOOGLE') {
      return await createGoogleCalendarEvent(user.CalendarConnection, eventData);
    } else if (provider === 'MICROSOFT') {
      return await createMicrosoftCalendarEvent(user.CalendarConnection, eventData);
    } else if (provider === 'ICAL') {
      console.log(`[calendar-sync] iCal is read-only, cannot create event`);
      return { success: false, error: 'iCal calendars are read-only' };
    }

    return { success: false, error: `Unsupported provider: ${provider}` };
  } catch (error: any) {
    console.error('[calendar-sync] Error creating calendar event:', error);
    return { success: false, error: error.message };
  }
}

async function createGoogleCalendarEvent(
  connection: any,
  eventData: CalendarEventData
): Promise<{ success: boolean; error?: string; eventId?: string }> {
  try {
    let accessToken = connection.accessToken;

    // Refresh token if needed
    if (connection.refreshToken) {
      try {
        const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID!,
            client_secret: process.env.GOOGLE_CLIENT_SECRET!,
            refresh_token: connection.refreshToken,
            grant_type: 'refresh_token',
          }),
        });

        if (refreshResponse.ok) {
          const tokenData = await refreshResponse.json();
          accessToken = tokenData.access_token;
          
          await prisma.calendarConnection.update({
            where: { id: connection.id },
            data: { accessToken: tokenData.access_token }
          });
        }
      } catch (refreshError) {
        console.error('[calendar-sync] Google token refresh failed:', refreshError);
      }
    }

    // Create the event
    const event = {
      summary: eventData.summary,
      description: eventData.description,
      start: {
        dateTime: eventData.startTime.toISOString(),
        timeZone: 'UTC',
      },
      end: {
        dateTime: eventData.endTime.toISOString(),
        timeZone: 'UTC',
      },
      attendees: eventData.attendees?.map(email => ({ email })),
      conferenceData: eventData.meetingUrl ? {
        entryPoints: [{
          entryPointType: 'video',
          uri: eventData.meetingUrl,
          label: 'Daily.co Meeting'
        }]
      } : undefined,
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 60 },
          { method: 'popup', minutes: 15 }
        ]
      }
    };

    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    );

    if (response.ok) {
      const createdEvent = await response.json();
      console.log(`[calendar-sync] Created Google Calendar event: ${createdEvent.id}`);
      return { success: true, eventId: createdEvent.id };
    } else {
      const error = await response.text();
      console.error('[calendar-sync] Failed to create Google Calendar event:', error);
      return { success: false, error: `Google API error: ${response.status}` };
    }
  } catch (error: any) {
    console.error('[calendar-sync] Error in createGoogleCalendarEvent:', error);
    return { success: false, error: error.message };
  }
}

async function createMicrosoftCalendarEvent(
  connection: any,
  eventData: CalendarEventData
): Promise<{ success: boolean; error?: string; eventId?: string }> {
  try {
    let accessToken = connection.accessToken;

    // Refresh token if needed
    if (connection.refreshToken) {
      try {
        const refreshResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: process.env.MS_CLIENT_ID!,
            client_secret: process.env.MS_CLIENT_SECRET!,
            refresh_token: connection.refreshToken,
            grant_type: 'refresh_token',
          }),
        });

        if (refreshResponse.ok) {
          const tokenData = await refreshResponse.json();
          accessToken = tokenData.access_token;
          
          await prisma.calendarConnection.update({
            where: { id: connection.id },
            data: { accessToken: tokenData.access_token }
          });
        }
      } catch (refreshError) {
        console.error('[calendar-sync] Microsoft token refresh failed:', refreshError);
      }
    }

    // Create the event
    const event = {
      subject: eventData.summary,
      body: {
        contentType: 'HTML',
        content: eventData.description,
      },
      start: {
        dateTime: eventData.startTime.toISOString(),
        timeZone: 'UTC',
      },
      end: {
        dateTime: eventData.endTime.toISOString(),
        timeZone: 'UTC',
      },
      attendees: eventData.attendees?.map(email => ({
        emailAddress: { address: email },
        type: 'required'
      })),
      isOnlineMeeting: !!eventData.meetingUrl,
      onlineMeetingUrl: eventData.meetingUrl,
      reminderMinutesBeforeStart: 15,
    };

    const response = await fetch(
      'https://graph.microsoft.com/v1.0/me/events',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    );

    if (response.ok) {
      const createdEvent = await response.json();
      console.log(`[calendar-sync] Created Microsoft Calendar event: ${createdEvent.id}`);
      return { success: true, eventId: createdEvent.id };
    } else {
      const error = await response.text();
      console.error('[calendar-sync] Failed to create Microsoft Calendar event:', error);
      return { success: false, error: `Microsoft API error: ${response.status}` };
    }
  } catch (error: any) {
    console.error('[calendar-sync] Error in createMicrosoftCalendarEvent:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteCalendarEventForBooking(
  userId: string,
  eventId: string,
  provider: 'GOOGLE' | 'MICROSOFT'
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get user's calendar connection
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { CalendarConnection: true }
    });

    if (!user?.CalendarConnection) {
      console.log(`[calendar-sync] No calendar connection for user ${userId}`);
      return { success: false, error: 'No calendar connected' };
    }

    if (provider === 'GOOGLE') {
      return await deleteGoogleCalendarEvent(user.CalendarConnection, eventId);
    } else if (provider === 'MICROSOFT') {
      return await deleteMicrosoftCalendarEvent(user.CalendarConnection, eventId);
    }

    return { success: false, error: `Unsupported provider: ${provider}` };
  } catch (error: any) {
    console.error('[calendar-sync] Error deleting calendar event:', error);
    return { success: false, error: error.message };
  }
}

async function deleteGoogleCalendarEvent(
  connection: any,
  eventId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    let accessToken = connection.accessToken;

    // Refresh token if needed
    if (connection.refreshToken) {
      try {
        const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID!,
            client_secret: process.env.GOOGLE_CLIENT_SECRET!,
            refresh_token: connection.refreshToken,
            grant_type: 'refresh_token',
          }),
        });

        if (refreshResponse.ok) {
          const tokenData = await refreshResponse.json();
          accessToken = tokenData.access_token;
          
          await prisma.calendarConnection.update({
            where: { id: connection.id },
            data: { accessToken: tokenData.access_token }
          });
        }
      } catch (refreshError) {
        console.error('[calendar-sync] Google token refresh failed:', refreshError);
      }
    }

    // Delete the event
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (response.ok || response.status === 204 || response.status === 410) {
      console.log(`[calendar-sync] Deleted Google Calendar event: ${eventId}`);
      return { success: true };
    } else {
      const error = await response.text();
      console.error('[calendar-sync] Failed to delete Google Calendar event:', error);
      return { success: false, error: `Google API error: ${response.status}` };
    }
  } catch (error: any) {
    console.error('[calendar-sync] Error in deleteGoogleCalendarEvent:', error);
    return { success: false, error: error.message };
  }
}

async function deleteMicrosoftCalendarEvent(
  connection: any,
  eventId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    let accessToken = connection.accessToken;

    // Refresh token if needed
    if (connection.refreshToken) {
      try {
        const refreshResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: process.env.MS_CLIENT_ID!,
            client_secret: process.env.MS_CLIENT_SECRET!,
            refresh_token: connection.refreshToken,
            grant_type: 'refresh_token',
          }),
        });

        if (refreshResponse.ok) {
          const tokenData = await refreshResponse.json();
          accessToken = tokenData.access_token;
          
          await prisma.calendarConnection.update({
            where: { id: connection.id },
            data: { accessToken: tokenData.access_token }
          });
        }
      } catch (refreshError) {
        console.error('[calendar-sync] Microsoft token refresh failed:', refreshError);
      }
    }

    // Delete the event
    const response = await fetch(
      `https://graph.microsoft.com/v1.0/me/events/${eventId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (response.ok || response.status === 204) {
      console.log(`[calendar-sync] Deleted Microsoft Calendar event: ${eventId}`);
      return { success: true };
    } else {
      const error = await response.text();
      console.error('[calendar-sync] Failed to delete Microsoft Calendar event:', error);
      return { success: false, error: `Microsoft API error: ${response.status}` };
    }
  } catch (error: any) {
    console.error('[calendar-sync] Error in deleteMicrosoftCalendarEvent:', error);
    return { success: false, error: error.message };
  }
}