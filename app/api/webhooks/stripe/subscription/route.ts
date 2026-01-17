// NOTE: Subscription handlers removed - reader subscriptions are now free. Only booking payments are processed.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-11-17.clover",
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const sig = req.headers.get("stripe-signature");

    if (!sig) {
      return NextResponse.json({ error: "No signature" }, { status: 400 });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } catch (err: any) {
      console.error("[webhook] Signature verification failed:", err.message);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    console.log("[webhook] Event type:", event.type);

    // Handle booking payment events only
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        
        // Only process booking payments (not subscriptions)
        if (session.mode === "payment" && session.metadata?.bookingId) {
          await handleBookingPaymentCompleted(session);
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("[webhook] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Handler: Booking Payment Completed
async function handleBookingPaymentCompleted(session: Stripe.Checkout.Session) {
  const bookingId = session.metadata?.bookingId;

  if (!bookingId) {
    console.warn("[webhook] No bookingId in checkout session metadata");
    return;
  }

  console.log(`[webhook] Processing booking payment for ${bookingId}`);

  try {
    // Check if booking already confirmed to prevent duplicate processing
    const existingBooking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { status: true, totalCents: true },
    });

    if (!existingBooking) {
      console.error(`[webhook] Booking ${bookingId} not found`);
      return;
    }

    if (existingBooking.status === "CONFIRMED") {
      console.log(`[webhook] Booking ${bookingId} already confirmed, skipping`);
      return;
    }

    // Calculate revenue split (80% to reader, 20% platform fee)
    const totalCents = existingBooking.totalCents;
    const readerEarningsCents = Math.floor(totalCents * 0.8);
    const platformFeeCents = totalCents - readerEarningsCents;

    console.log(
      `[webhook] Revenue split - Total: $${totalCents / 100}, Reader: $${readerEarningsCents / 100}, Platform: $${platformFeeCents / 100}`
    );

    // Update booking status to CONFIRMED with revenue split
    const booking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: "CONFIRMED",
        readerEarningsCents,
        platformFeeCents,
        stripePaymentIntentId: session.payment_intent as string,
      },
      include: {
        User_Booking_readerIdToUser: {
          select: {
            id: true,
            name: true,
            displayName: true,
            email: true,
            timezone: true,
            CalendarConnection: true,
          },
        },
        User_Booking_actorIdToUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    console.log(`[webhook] ✅ Confirmed booking ${bookingId}`);

    // Send confirmation emails
    try {
      const { sendBookingConfirmation } = await import(
        "@/lib/send-booking-confirmation"
      );
      await sendBookingConfirmation(booking);
    } catch (emailError) {
      console.error("[webhook] Failed to send confirmation emails:", emailError);
    }

    // Create calendar event for reader if they have calendar connected
    const reader = booking.User_Booking_readerIdToUser;
    if (reader.CalendarConnection) {
      const provider = reader.CalendarConnection.provider;
      if (provider === "GOOGLE") {
        await createGoogleCalendarEvent(booking);
      } else if (provider === "MICROSOFT") {
        await createMicrosoftCalendarEvent(booking);
      } else if (provider === "ICAL") {
        console.log(
          `[webhook] Reader ${reader.id} has iCal (read-only), skipping calendar event creation`
        );
      }
    } else {
      console.log(`[webhook] Reader ${reader.id} has no calendar connected`);
    }
  } catch (error) {
    console.error(`[webhook] Error processing booking ${bookingId}:`, error);
  }
}

// Create Google Calendar Event
async function createGoogleCalendarEvent(booking: any) {
  try {
    const reader = booking.User_Booking_readerIdToUser;
    const actor = booking.User_Booking_actorIdToUser;
    const calendarConnection = reader.CalendarConnection;

    console.log(`[Google Calendar] Creating event for reader ${reader.id}`);

    let accessToken = calendarConnection.accessToken;

    // Refresh access token if needed
    if (calendarConnection.refreshToken) {
      try {
        const refreshResponse = await fetch(
          "https://oauth2.googleapis.com/token",
          {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              client_id: process.env.GOOGLE_CLIENT_ID!,
              client_secret: process.env.GOOGLE_CLIENT_SECRET!,
              refresh_token: calendarConnection.refreshToken,
              grant_type: "refresh_token",
            }),
          }
        );

        if (refreshResponse.ok) {
          const tokenData = await refreshResponse.json();
          accessToken = tokenData.access_token;

          await prisma.calendarConnection.update({
            where: { id: calendarConnection.id },
            data: { accessToken: tokenData.access_token },
          });

          console.log(`[Google Calendar] Refreshed access token for reader ${reader.id}`);
        }
      } catch (refreshError) {
        console.error("[Google Calendar] Token refresh failed:", refreshError);
      }
    }

    const startTime = new Date(booking.startTime);
    const endTime = new Date(booking.endTime);
    const readerTimezone = reader.timezone || "America/New_York";

    let description = `Self-tape reading session.\n\nActor: ${actor.name}\nEmail: ${actor.email}\n\nMeeting URL: ${booking.meetingUrl || "TBD"}`;

    if (booking.sidesUrl || booking.sidesLink) {
      description += "\n\n--- AUDITION SIDES ---\n";
      if (booking.sidesUrl) {
        const fullUrl = booking.sidesUrl.startsWith("http")
          ? booking.sidesUrl
          : `${process.env.NEXT_PUBLIC_URL || "http://localhost:3000"}${booking.sidesUrl}`;
        description += `Document: ${fullUrl}`;
        if (booking.sidesFileName) {
          description += ` (${booking.sidesFileName})`;
        }
        description += "\n";
      }
      if (booking.sidesLink) {
        description += `Link: ${booking.sidesLink}\n`;
      }
    }

    const eventData = {
      summary: `Reading Session with ${actor.name}`,
      description,
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
          responseStatus: "accepted",
        },
        {
          email: actor.email,
          displayName: actor.name,
          responseStatus: "needsAction",
        },
      ],
      reminders: {
        useDefault: false,
        overrides: [
          { method: "email", minutes: 60 },
          { method: "popup", minutes: 15 },
        ],
      },
    };

    const calendarResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventData),
      }
    );

    if (calendarResponse.ok) {
      const event = await calendarResponse.json();
      console.log(`[Google Calendar] ✅ Created event ${event.id} for booking ${booking.id}`);

      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          notes: JSON.stringify({ calendarEventId: event.id }),
        },
      });
    } else {
      const errorText = await calendarResponse.text();
      console.error(`[Google Calendar] Failed to create event:`, errorText);
    }
  } catch (error) {
    console.error("[Google Calendar] Error creating event:", error);
  }
}

// Create Microsoft Calendar Event
async function createMicrosoftCalendarEvent(booking: any) {
  try {
    const reader = booking.User_Booking_readerIdToUser;
    const actor = booking.User_Booking_actorIdToUser;
    const calendarConnection = reader.CalendarConnection;

    console.log(`[Microsoft Calendar] Creating event for reader ${reader.id}`);

    let accessToken = calendarConnection.accessToken;

    // Refresh access token if needed
    if (calendarConnection.refreshToken) {
      try {
        const refreshResponse = await fetch(
          "https://login.microsoftonline.com/common/oauth2/v2.0/token",
          {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              client_id: process.env.MS_CLIENT_ID!,
              client_secret: process.env.MS_CLIENT_SECRET!,
              refresh_token: calendarConnection.refreshToken,
              grant_type: "refresh_token",
            }),
          }
        );

        if (refreshResponse.ok) {
          const tokenData = await refreshResponse.json();
          accessToken = tokenData.access_token;

          await prisma.calendarConnection.update({
            where: { id: calendarConnection.id },
            data: { accessToken: tokenData.access_token },
          });

          console.log(`[Microsoft Calendar] Refreshed access token for reader ${reader.id}`);
        }
      } catch (refreshError) {
        console.error("[Microsoft Calendar] Token refresh failed:", refreshError);
      }
    }

    const startTime = new Date(booking.startTime);
    const endTime = new Date(booking.endTime);
    const readerTimezone = reader.timezone || "America/New_York";

    let description = `Self-tape reading session.<br><br>Actor: ${actor.name}<br>Email: ${actor.email}<br><br>Meeting URL: ${booking.meetingUrl || "TBD"}`;

    if (booking.sidesUrl || booking.sidesLink) {
      description += "<br><br><b>AUDITION SIDES</b><br>";
      if (booking.sidesUrl) {
        const fullUrl = booking.sidesUrl.startsWith("http")
          ? booking.sidesUrl
          : `${process.env.NEXT_PUBLIC_URL || "http://localhost:3000"}${booking.sidesUrl}`;
        description += `Document: <a href="${fullUrl}">${booking.sidesFileName || "View sides"}</a><br>`;
      }
      if (booking.sidesLink) {
        description += `Link: <a href="${booking.sidesLink}">${booking.sidesLink}</a><br>`;
      }
    }

    const eventData = {
      subject: `Reading Session with ${actor.name}`,
      body: {
        contentType: "HTML",
        content: description,
      },
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
          emailAddress: {
            address: reader.email,
            name: reader.displayName || reader.name,
          },
          type: "required",
        },
        {
          emailAddress: { address: actor.email, name: actor.name },
          type: "required",
        },
      ],
      isOnlineMeeting: !!booking.meetingUrl,
      onlineMeetingUrl: booking.meetingUrl,
      reminderMinutesBeforeStart: 15,
    };

    const calendarResponse = await fetch(
      `https://graph.microsoft.com/v1.0/me/events`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventData),
      }
    );

    if (calendarResponse.ok) {
      const event = await calendarResponse.json();
      console.log(`[Microsoft Calendar] ✅ Created event ${event.id} for booking ${booking.id}`);

      const existingNotes = booking.notes ? JSON.parse(booking.notes) : {};
      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          notes: JSON.stringify({ ...existingNotes, calendarEventId: event.id }),
        },
      });
    } else {
      const errorText = await calendarResponse.text();
      console.error(`[Microsoft Calendar] Failed to create event:`, errorText);
    }
  } catch (error) {
    console.error("[Microsoft Calendar] Error creating event:", error);
  }
}