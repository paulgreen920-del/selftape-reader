import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-11-17.clover",
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

async function POST(req: Request) {
  try {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json({ error: "No signature" }, { status: 400 });
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err.message);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    console.log(`[Stripe Webhook] Event: ${event.type}`);

    // Handle different event types
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentSucceeded(invoice);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("[Stripe Webhook] Error:", err);
    return NextResponse.json(
      { error: err.message || "Webhook error" },
      { status: 500 }
    );
  }
}

// Handler: Checkout Session Completed
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  console.log(`[Checkout] Session mode: ${session.mode}`);
  console.log(`[Checkout] Session metadata:`, session.metadata);
  
  // Handle booking payments
  if (session.mode === "payment" && session.metadata?.bookingId) {
    await handleBookingPaymentCompleted(session);
  }
  // Handle reader subscriptions
  else if (session.mode === "subscription" && session.metadata?.type === "reader_subscription") {
    const readerId = session.metadata.readerId;
    const subscriptionId = session.subscription as string;
    const customerId = session.customer as string;

    console.log(`[Checkout] readerId: ${readerId}`);
    console.log(`[Checkout] subscriptionId: ${subscriptionId}`);
    console.log(`[Checkout] customerId: ${customerId}`);

    if (!readerId) {
      console.warn("❌ No readerId in checkout session metadata");
      return;
    }

    // Update user with subscription info and upgrade to READER
    const updated = await prisma.user.update({
      where: { id: readerId },
      data: {
        stripeCustomerId: customerId,
        subscriptionId: subscriptionId,
        subscriptionStatus: "active",
        role: "READER",
        isActive: true,
        onboardingStep: null, // Clear onboarding step when subscription is active
      },
    });

    console.log(`✅ [Checkout Completed] Upgraded user ${readerId} to READER`);
    console.log(`✅ Updated user role: ${updated.role}`);
  } else {
    console.log(`[Checkout] Skipped - not a reader subscription (mode: ${session.mode}, type: ${session.metadata?.type})`);
  }
}

// Handler: Subscription Updated
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const readerId = subscription.metadata.readerId;
  
  if (readerId) {
    // Update by readerId if available in metadata
    const status = subscription.status;
    const cancelAtPeriodEnd = subscription.cancel_at_period_end;

    await prisma.user.update({
      where: { id: readerId },
      data: {
        subscriptionStatus: cancelAtPeriodEnd ? "canceling" : status,
        subscriptionId: subscription.id,
      },
    });

    console.log(`Updated user ${readerId} subscription status to: ${status}`);
  } else {
    // Fall back to finding by subscription ID
    const user = await prisma.user.findFirst({
      where: { subscriptionId: subscription.id },
    });

    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          subscriptionStatus: subscription.status,
        },
      });

      console.log(`Updated user ${user.id} subscription status to: ${subscription.status}`);
    }
  }
}

// Handler: Subscription Deleted
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const readerId = subscription.metadata.readerId;
  
  if (readerId) {
    // Update by readerId if available
    await prisma.user.update({
      where: { id: readerId },
      data: {
        subscriptionStatus: "canceled",
        isActive: false,
        role: "ACTOR",
      },
    });

    console.log(`Downgraded user ${readerId} to ACTOR due to subscription cancellation`);
  } else {
    // Fall back to finding by subscription ID
    const user = await prisma.user.findFirst({
      where: { subscriptionId: subscription.id },
    });

    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          subscriptionStatus: "canceled",
          isActive: false,
          role: "ACTOR",
        },
      });

      console.log(`Downgraded user ${user.id} to ACTOR due to subscription cancellation`);
    }
  }
}

// Handler: Payment Failed
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = (invoice as any).subscription as string;
  if (!subscriptionId) return;

  const user = await prisma.user.findFirst({
    where: { subscriptionId },
  });

  if (!user) {
    console.warn(`No user found for subscription ${subscriptionId}`);
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      subscriptionStatus: "past_due",
    },
  });

  console.log(`Payment failed for user ${user.id}, marked as past_due`);
}

// Handler: Payment Succeeded
async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const subscriptionId = (invoice as any).subscription as string;
  const customerId = invoice.customer as string;
  
  if (!subscriptionId || !customerId) {
    console.warn("Missing subscriptionId or customerId in invoice");
    return;
  }

  // Find user by Stripe customer ID
  const user = await prisma.user.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!user) {
    console.warn(`No user found for customer ${customerId}`);
    return;
  }

  // Save subscription ID if not already set
  if (!user.subscriptionId) {
    await prisma.user.update({
      where: { id: user.id },
      data: { subscriptionId },
    });
  }

  // Upgrade to READER and activate on first successful payment
  if (user.role === "ACTOR") {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        role: "READER",
        subscriptionStatus: "active",
        subscriptionId: subscriptionId,
        isActive: true,
      },
    });
    console.log(`✅ [Payment Succeeded] Upgraded user ${user.id} from ACTOR to READER`);
  } 
  // Reactivate if was past_due
  else if (user.subscriptionStatus === "past_due") {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionStatus: "active",
      },
    });
    console.log(`Payment succeeded for user ${user.id}, reactivated from past_due`);
  }
}

// Handler: Booking Payment Completed
async function handleBookingPaymentCompleted(session: Stripe.Checkout.Session) {
  const bookingId = session.metadata?.bookingId;
  
  if (!bookingId) {
    console.warn("No bookingId in checkout session metadata");
    return;
  }

  console.log(`[Booking Payment] Processing booking ${bookingId}`);

  try {
    // Check if booking already confirmed to prevent duplicate processing
    const existingBooking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { status: true }
    });

    if (existingBooking?.status === 'CONFIRMED') {
      console.log(`[Booking Payment] Booking ${bookingId} already confirmed, skipping`);
      return;
    }

    // Get booking to calculate revenue split
    const existingBookingData = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { totalCents: true }
    });

    if (!existingBookingData) {
      console.error(`[Booking Payment] Booking ${bookingId} not found`);
      return;
    }

    // Calculate revenue split (80% to reader, 20% platform fee)
    const totalCents = existingBookingData.totalCents;
    const readerEarningsCents = Math.floor(totalCents * 0.8);
    const platformFeeCents = totalCents - readerEarningsCents;

    console.log(`[Booking Payment] Revenue split - Total: $${totalCents/100}, Reader: $${readerEarningsCents/100}, Platform: $${platformFeeCents/100}`);

    // Update booking status to CONFIRMED with revenue split
    const booking = await prisma.booking.update({
      where: { id: bookingId },
      data: { 
        status: "CONFIRMED",
        readerEarningsCents,
        platformFeeCents,
        stripePaymentIntentId: session.payment_intent as string
      },
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

    console.log(`[Booking Payment] Confirmed booking ${bookingId}`);

    // Send confirmation emails
    try {
      const { sendBookingConfirmation } = await import('@/lib/send-booking-confirmation');
      await sendBookingConfirmation(booking);
    } catch (emailError) {
      console.error('[Booking Payment] Failed to send emails:', emailError);
    }

    // Create calendar event for reader if they have calendar connected
    const reader = booking.User_Booking_readerIdToUser;
    if (reader.CalendarConnection) {
      const provider = reader.CalendarConnection.provider;
      if (provider === 'GOOGLE') {
        await createGoogleCalendarEvent(booking);
      } else if (provider === 'MICROSOFT') {
        await createMicrosoftCalendarEvent(booking);
      } else if (provider === 'ICAL') {
        console.log(`[Booking Payment] Reader ${reader.id} has iCal (read-only), skipping calendar event creation`);
      }
    } else {
      console.log(`[Booking Payment] Reader ${reader.id} has no calendar connected`);
    }

  } catch (error) {
    console.error(`[Booking Payment] Error processing booking ${bookingId}:`, error);
  }
}

// Create Google Calendar Event
async function createGoogleCalendarEvent(booking: any) {
  try {
    const reader = booking.User_Booking_readerIdToUser;
    const actor = booking.User_Booking_actorIdToUser;
    const calendarConnection = reader.CalendarConnection;

    console.log(`[Google Calendar] Creating event for reader ${reader.id}`);

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
          
          console.log(`[Google Calendar] Refreshed access token for reader ${reader.id}`);
        }
      } catch (refreshError) {
        console.error('[Google Calendar] Token refresh failed:', refreshError);
      }
    }

    // Format event data
    const startTime = new Date(booking.startTime);
    const endTime = new Date(booking.endTime);
    const readerTimezone = reader.timezone || 'America/New_York';

    // Build description with audition sides if provided
    let description = `Self-tape reading session.\n\nActor: ${actor.name}\nEmail: ${actor.email}\n\nMeeting URL: ${booking.meetingUrl || 'TBD'}`;
    
    if (booking.sidesUrl || booking.sidesLink) {
      description += '\n\n--- AUDITION SIDES ---\n';
      if (booking.sidesUrl) {
        const fullUrl = booking.sidesUrl.startsWith('http') ? booking.sidesUrl : `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}${booking.sidesUrl}`;
        description += `Document: ${fullUrl}`;
        if (booking.sidesFileName) {
          description += ` (${booking.sidesFileName})`;
        }
        description += '\n';
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
      console.log(`[Google Calendar] ✅ Created event ${event.id} for booking ${booking.id}`);
      
      // Store calendar event ID in booking for future reference
      await prisma.booking.update({
        where: { id: booking.id },
        data: { 
          // Add calendarEventId field if it exists in schema, or use a JSON field
          notes: JSON.stringify({ calendarEventId: event.id })
        }
      });
      
    } else {
      const errorText = await calendarResponse.text();
      console.error(`[Google Calendar] Failed to create event:`, errorText);
    }

  } catch (error) {
    console.error('[Google Calendar] Error creating event:', error);
  }
}

// Create Microsoft Calendar Event
async function createMicrosoftCalendarEvent(booking: any) {
  try {
    const reader = booking.User_Booking_readerIdToUser;
    const actor = booking.User_Booking_actorIdToUser;
    const calendarConnection = reader.CalendarConnection;

    console.log(`[Microsoft Calendar] Creating event for reader ${reader.id}`);

    // Refresh access token if needed
    let accessToken = calendarConnection.accessToken;
    
    if (calendarConnection.refreshToken) {
      try {
        const refreshResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
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
          
          console.log(`[Microsoft Calendar] Refreshed access token for reader ${reader.id}`);
        }
      } catch (refreshError) {
        console.error('[Microsoft Calendar] Token refresh failed:', refreshError);
      }
    }

    // Format event data
    const startTime = new Date(booking.startTime);
    const endTime = new Date(booking.endTime);
    const readerTimezone = reader.timezone || 'America/New_York';

    // Build description with audition sides if provided
    let description = `Self-tape reading session.<br><br>Actor: ${actor.name}<br>Email: ${actor.email}<br><br>Meeting URL: ${booking.meetingUrl || 'TBD'}`;
    
    if (booking.sidesUrl || booking.sidesLink) {
      description += '<br><br><b>AUDITION SIDES</b><br>';
      if (booking.sidesUrl) {
        const fullUrl = booking.sidesUrl.startsWith('http') ? booking.sidesUrl : `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}${booking.sidesUrl}`;
        description += `Document: <a href="${fullUrl}">${booking.sidesFileName || 'View sides'}</a><br>`;
      }
      if (booking.sidesLink) {
        description += `Link: <a href="${booking.sidesLink}">${booking.sidesLink}</a><br>`;
      }
    }

    const eventData = {
      subject: `Reading Session with ${actor.name}`,
      body: {
        contentType: 'HTML',
        content: description
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
          emailAddress: { address: reader.email, name: reader.displayName || reader.name },
          type: 'required'
        },
        {
          emailAddress: { address: actor.email, name: actor.name },
          type: 'required'
        }
      ],
      isOnlineMeeting: !!booking.meetingUrl,
      onlineMeetingUrl: booking.meetingUrl,
      reminderMinutesBeforeStart: 15
    };

    // Create calendar event
    const calendarResponse = await fetch(
      `https://graph.microsoft.com/v1.0/me/events`,
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
      console.log(`[Microsoft Calendar] ✅ Created event ${event.id} for booking ${booking.id}`);
      
      // Store calendar event ID in booking
      const existingNotes = booking.notes ? JSON.parse(booking.notes) : {};
      await prisma.booking.update({
        where: { id: booking.id },
        data: { 
          notes: JSON.stringify({ ...existingNotes, calendarEventId: event.id })
        }
      });
      
    } else {
      const errorText = await calendarResponse.text();
      console.error(`[Microsoft Calendar] Failed to create event:`, errorText);
    }

  } catch (error) {
    console.error('[Microsoft Calendar] Error creating event:', error);
  }
}

export { POST };
