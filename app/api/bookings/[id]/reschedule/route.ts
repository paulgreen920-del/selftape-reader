import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createCalendarEventForBooking, deleteCalendarEventForBooking } from "@/lib/calendar-sync";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookingId } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { ok: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Get booking with calendar event IDs
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        User_Booking_readerIdToUser: {
          select: {
            id: true,
            email: true,
            displayName: true,
            name: true,
            timezone: true,
            CalendarConnection: true,
          },
        },
        User_Booking_actorIdToUser: {
          select: {
            id: true,
            email: true,
            name: true,
            timezone: true,
            CalendarConnection: true,
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json(
        { ok: false, error: "Booking not found" },
        { status: 404 }
      );
    }

    // Check authorization - only actor or reader can reschedule
    if (booking.actorId !== userId && booking.readerId !== userId) {
      return NextResponse.json(
        { ok: false, error: "Not authorized to reschedule this booking" },
        { status: 403 }
      );
    }

    // Check booking status
    if (booking.status !== "CONFIRMED") {
      return NextResponse.json(
        { ok: false, error: "Only confirmed bookings can be rescheduled" },
        { status: 400 }
      );
    }

    // Check if booking is more than 2 hours away
    const now = new Date();
    const startTime = new Date(booking.startTime);
    const hoursUntil = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntil < 2) {
      return NextResponse.json(
        { ok: false, error: "Bookings can only be rescheduled more than 2 hours before the session" },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { newStartTime, newEndTime } = body;

    if (!newStartTime || !newEndTime) {
      return NextResponse.json(
        { ok: false, error: "New start and end times are required" },
        { status: 400 }
      );
    }

    const newStart = new Date(newStartTime);
    const newEnd = new Date(newEndTime);

    // Validate new time is in the future
    if (newStart <= now) {
      return NextResponse.json(
        { ok: false, error: "New time must be in the future" },
        { status: 400 }
      );
    }

    // Check that the new slot is available (not booked)
    const conflictingBooking = await prisma.booking.findFirst({
      where: {
        readerId: booking.readerId,
        id: { not: bookingId },
        status: { in: ["CONFIRMED", "PENDING"] },
        OR: [
          {
            startTime: { lt: newEnd },
            endTime: { gt: newStart },
          },
        ],
      },
    });

    if (conflictingBooking) {
      return NextResponse.json(
        { ok: false, error: "This time slot is no longer available" },
        { status: 400 }
      );
    }

    // Check reader has availability for this slot
    const availabilitySlot = await prisma.availabilitySlot.findFirst({
      where: {
        userId: booking.readerId,
        startTime: { lte: newStart },
        endTime: { gte: newEnd },
        isBooked: false,
      },
    });

    // Store old time for email and old event IDs for calendar
    const oldStartTime = booking.startTime;
    const oldEndTime = booking.endTime;
    const oldGoogleEventId = booking.googleEventId;
    const oldMicrosoftEventId = booking.microsoftEventId;

    const reader = booking.User_Booking_readerIdToUser;
    const actor = booking.User_Booking_actorIdToUser;

    // Delete old calendar events
    if (oldGoogleEventId && reader.CalendarConnection?.provider === 'GOOGLE') {
      console.log(`[reschedule] Deleting old Google Calendar event: ${oldGoogleEventId}`);
      await deleteCalendarEventForBooking(reader.id, oldGoogleEventId, 'GOOGLE');
    }
    if (oldMicrosoftEventId && reader.CalendarConnection?.provider === 'MICROSOFT') {
      console.log(`[reschedule] Deleting old Microsoft Calendar event: ${oldMicrosoftEventId}`);
      await deleteCalendarEventForBooking(reader.id, oldMicrosoftEventId, 'MICROSOFT');
    }

    // Update the booking
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        startTime: newStart,
        endTime: newEnd,
        googleEventId: null, // Clear old event IDs
        microsoftEventId: null,
        updatedAt: new Date(),
      },
    });

    // Mark old availability slot as not booked (if it exists)
    await prisma.availabilitySlot.updateMany({
      where: {
        userId: booking.readerId,
        startTime: oldStartTime,
        isBooked: true,
      },
      data: {
        isBooked: false,
      },
    });

    // Mark new availability slot as booked (if it exists)
    if (availabilitySlot) {
      await prisma.availabilitySlot.update({
        where: { id: availabilitySlot.id },
        data: { isBooked: true },
      });
    }

    // Create new calendar events for reader
    if (reader.CalendarConnection) {
      const readerName = reader.displayName || reader.name || 'Reader';
      const actorName = actor.name || 'Actor';
      
      const eventData = {
        bookingId: booking.id,
        summary: `Self-Tape Session with ${actorName}`,
        description: `${booking.durationMinutes}-minute self-tape reading session.\n\nMeeting URL: ${booking.meetingUrl || 'TBD'}`,
        startTime: newStart,
        endTime: newEnd,
        attendees: [actor.email],
        meetingUrl: booking.meetingUrl || undefined,
      };

      const calendarResult = await createCalendarEventForBooking(reader.id, eventData);
      
      if (calendarResult.success && calendarResult.eventId) {
        const provider = reader.CalendarConnection.provider;
        const updateData: any = {};
        
        if (provider === 'GOOGLE') {
          updateData.googleEventId = calendarResult.eventId;
        } else if (provider === 'MICROSOFT') {
          updateData.microsoftEventId = calendarResult.eventId;
        }
        
        if (Object.keys(updateData).length > 0) {
          await prisma.booking.update({
            where: { id: bookingId },
            data: updateData,
          });
        }
        
        console.log(`[reschedule] Created new calendar event: ${calendarResult.eventId}`);
      }
    }

    // Send reschedule notification emails
    try {
      await sendRescheduleEmails({
        booking: updatedBooking,
        reader,
        actor,
        oldStartTime,
        newStartTime: newStart,
        rescheduledBy: userId === booking.actorId ? "ACTOR" : "READER",
      });
    } catch (emailError) {
      console.error("[reschedule] Failed to send emails:", emailError);
    }

    console.log(`[reschedule] Booking ${bookingId} rescheduled from ${oldStartTime} to ${newStart}`);

    return NextResponse.json({
      ok: true,
      booking: updatedBooking,
    });
  } catch (err: any) {
    console.error("[reschedule] Error:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to reschedule booking" },
      { status: 500 }
    );
  }
}

// Send reschedule notification emails
async function sendRescheduleEmails(params: {
  booking: any;
  reader: any;
  actor: any;
  oldStartTime: Date;
  newStartTime: Date;
  rescheduledBy: "ACTOR" | "READER";
}) {
  const { booking, reader, actor, oldStartTime, newStartTime, rescheduledBy } = params;

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    console.log("[reschedule] No RESEND_API_KEY, skipping emails");
    return;
  }

  const { Resend } = await import("resend");
  const resend = new Resend(resendApiKey);

  const timezone = actor.timezone || reader.timezone || "America/New_York";
  const fromEmail = process.env.FROM_EMAIL || "noreply@selftapereader.com";
  const baseUrl = process.env.NEXT_PUBLIC_URL || "https://www.selftapereader.com";

  const formatDateTime = (date: Date) => {
    return date.toLocaleString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: timezone,
    });
  };

  const readerName = reader.displayName || reader.name || "Reader";
  const actorName = actor.name || "Actor";
  const rescheduledByName = rescheduledBy === "ACTOR" ? actorName : readerName;

  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Session Rescheduled</h2>
      <p>Your self-tape reading session has been rescheduled by ${rescheduledByName}.</p>
      
      <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 5px 0; text-decoration: line-through; color: #92400e;">
          <strong>Old Time:</strong> ${formatDateTime(oldStartTime)}
        </p>
      </div>
      
      <div style="background: #d1fae5; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 5px 0; color: #065f46;">
          <strong>New Time:</strong> ${formatDateTime(newStartTime)}
        </p>
        <p style="margin: 5px 0; color: #065f46;">
          <strong>Duration:</strong> ${booking.durationMinutes} minutes
        </p>
      </div>
      
      <p>
        <a href="${baseUrl}/dashboard" 
           style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none;">
          View Booking
        </a>
      </p>
    </div>
  `;

  await resend.emails.send({
    from: `Self-Tape Reader <${fromEmail}>`,
    to: actor.email,
    subject: `Session Rescheduled with ${readerName}`,
    html: emailHtml.replace("Your self-tape reading session", `Your session with ${readerName}`),
  });

  await resend.emails.send({
    from: `Self-Tape Reader <${fromEmail}>`,
    to: reader.email,
    subject: `Session Rescheduled with ${actorName}`,
    html: emailHtml.replace("Your self-tape reading session", `Your session with ${actorName}`),
  });

  console.log(`[reschedule] Emails sent to ${actor.email} and ${reader.email}`);
}