import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

interface CancellationEmailParams {
  booking: {
    id: string;
    startTime: Date;
    durationMinutes: number;
    totalCents: number;
  };
  reader: {
    id: string;
    email: string;
    name: string | null;
    displayName: string | null;
    timezone?: string | null;
  };
  actor: {
    id: string;
    email: string;
    name: string | null;
    timezone?: string | null;
  };
  canceledBy: "ACTOR" | "READER";
  refundAmount: number;
  refundType: "full" | "partial" | "none";
  readerWarning: boolean;
}

export async function sendCancellationEmails(params: CancellationEmailParams) {
  const { booking, reader, actor, canceledBy, refundAmount, refundType, readerWarning } = params;

  // Use actor's timezone, fall back to reader's, then default to Eastern
  const timezone = actor.timezone || reader.timezone || "America/New_York";

  const sessionDate = new Date(booking.startTime);
  const dateStr = sessionDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: timezone,
  });
  const timeStr = sessionDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: timezone,
  });

  const readerName = reader.displayName || reader.name || "Reader";
  const actorName = actor.name || "Actor";
  const refundDollars = (refundAmount / 100).toFixed(2);
  const totalDollars = (booking.totalCents / 100).toFixed(2);

  // Email to Actor
  let actorSubject: string;
  let actorBody: string;

  if (canceledBy === "ACTOR") {
    // Actor cancelled their own booking
    actorSubject = "Booking Cancelled - Self-Tape Reader";
    
    if (refundType === "partial") {
      actorBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Booking Cancelled</h2>
          <p>You've cancelled your session with <strong>${readerName}</strong>.</p>
          
          <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Date:</strong> ${dateStr}</p>
            <p style="margin: 5px 0;"><strong>Time:</strong> ${timeStr}</p>
            <p style="margin: 5px 0;"><strong>Duration:</strong> ${booking.durationMinutes} minutes</p>
          </div>
          
          <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0; color: #2e7d32;"><strong>Refund:</strong> $${refundDollars}</p>
            <p style="margin: 5px 0; font-size: 14px; color: #666;">A $2.00 processing fee was deducted from your refund.</p>
          </div>
          
          <p style="color: #666; font-size: 14px;">Your refund will be processed within 5-10 business days.</p>
        </div>
      `;
    } else if (refundType === "none") {
      actorBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Booking Cancelled</h2>
          <p>You've cancelled your session with <strong>${readerName}</strong>.</p>
          
          <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Date:</strong> ${dateStr}</p>
            <p style="margin: 5px 0;"><strong>Time:</strong> ${timeStr}</p>
            <p style="margin: 5px 0;"><strong>Duration:</strong> ${booking.durationMinutes} minutes</p>
          </div>
          
          <div style="background: #fff3e0; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0; color: #e65100;"><strong>No Refund</strong></p>
            <p style="margin: 5px 0; font-size: 14px; color: #666;">Because this cancellation was less than 2 hours before the session, no refund will be issued. The reader will receive payment for the session.</p>
          </div>
        </div>
      `;
    } else {
      actorBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Booking Cancelled</h2>
          <p>You've cancelled your session with <strong>${readerName}</strong>.</p>
          
          <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Date:</strong> ${dateStr}</p>
            <p style="margin: 5px 0;"><strong>Time:</strong> ${timeStr}</p>
            <p style="margin: 5px 0;"><strong>Duration:</strong> ${booking.durationMinutes} minutes</p>
          </div>
        </div>
      `;
    }
  } else {
    // Reader cancelled - actor gets full refund
    actorSubject = "Session Cancelled by Reader - Self-Tape Reader";
    actorBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Session Cancelled</h2>
        <p>Unfortunately, <strong>${readerName}</strong> has cancelled your upcoming session.</p>
        
        <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Date:</strong> ${dateStr}</p>
          <p style="margin: 5px 0;"><strong>Time:</strong> ${timeStr}</p>
          <p style="margin: 5px 0;"><strong>Duration:</strong> ${booking.durationMinutes} minutes</p>
        </div>
        
        <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 5px 0; color: #2e7d32;"><strong>Full Refund:</strong> $${totalDollars}</p>
          <p style="margin: 5px 0; font-size: 14px; color: #666;">Your full payment will be refunded within 5-10 business days.</p>
        </div>
        
        <p>We apologize for the inconvenience. You can book another session with a different reader at any time.</p>
        
        <a href="${process.env.NEXT_PUBLIC_BASE_URL}/readers" 
           style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 10px;">
          Find Another Reader
        </a>
      </div>
    `;
  }

  // Email to Reader
  let readerSubject: string;
  let readerBody: string;

  if (canceledBy === "READER") {
    // Reader cancelled their own booking
    readerSubject = "Booking Cancelled - Self-Tape Reader";
    
    if (readerWarning) {
      readerBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Booking Cancelled</h2>
          <p>You've cancelled your session with <strong>${actorName}</strong>.</p>
          
          <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Date:</strong> ${dateStr}</p>
            <p style="margin: 5px 0;"><strong>Time:</strong> ${timeStr}</p>
            <p style="margin: 5px 0;"><strong>Duration:</strong> ${booking.durationMinutes} minutes</p>
          </div>
          
          <div style="background: #fff3e0; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #e65100;">
            <p style="margin: 5px 0; color: #e65100;"><strong>⚠️ Late Cancellation Warning</strong></p>
            <p style="margin: 5px 0; font-size: 14px; color: #666;">This cancellation was less than 24 hours before the session. Repeated late cancellations may affect your reliability score and visibility on the platform.</p>
          </div>
          
          <p style="color: #666; font-size: 14px;">The actor has been notified and will receive a full refund.</p>
        </div>
      `;
    } else {
      readerBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Booking Cancelled</h2>
          <p>You've cancelled your session with <strong>${actorName}</strong>.</p>
          
          <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Date:</strong> ${dateStr}</p>
            <p style="margin: 5px 0;"><strong>Time:</strong> ${timeStr}</p>
            <p style="margin: 5px 0;"><strong>Duration:</strong> ${booking.durationMinutes} minutes</p>
          </div>
          
          <p style="color: #666; font-size: 14px;">The actor has been notified and will receive a full refund.</p>
        </div>
      `;
    }
  } else {
    // Actor cancelled
    if (refundType === "none") {
      // Actor late cancel - reader gets paid
      readerSubject = "Booking Cancelled - You'll Still Be Paid";
      readerBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Session Cancelled</h2>
          <p><strong>${actorName}</strong> has cancelled their session with you.</p>
          
          <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Date:</strong> ${dateStr}</p>
            <p style="margin: 5px 0;"><strong>Time:</strong> ${timeStr}</p>
            <p style="margin: 5px 0;"><strong>Duration:</strong> ${booking.durationMinutes} minutes</p>
          </div>
          
          <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0; color: #2e7d32;"><strong>💰 You'll Still Be Paid</strong></p>
            <p style="margin: 5px 0; font-size: 14px; color: #666;">Because this was a late cancellation (less than 2 hours notice), you will receive full payment for this session.</p>
          </div>
          
          <p style="color: #666; font-size: 14px;">Your time slot has been freed up for other bookings.</p>
        </div>
      `;
    } else {
      // Actor cancelled with enough notice - reader doesn't get paid
      readerSubject = "Booking Cancelled - Self-Tape Reader";
      readerBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Session Cancelled</h2>
          <p><strong>${actorName}</strong> has cancelled their session with you.</p>
          
          <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Date:</strong> ${dateStr}</p>
            <p style="margin: 5px 0;"><strong>Time:</strong> ${timeStr}</p>
            <p style="margin: 5px 0;"><strong>Duration:</strong> ${booking.durationMinutes} minutes</p>
          </div>
          
          <p style="color: #666; font-size: 14px;">Your time slot has been freed up and is now available for other bookings.</p>
        </div>
      `;
    }
  }

  // Send both emails
  const fromEmail = process.env.FROM_EMAIL || "noreply@selftapereader.com";

  await Promise.all([
    resend.emails.send({
      from: `Self-Tape Reader <${fromEmail}>`,
      to: actor.email,
      subject: actorSubject,
      html: actorBody,
    }),
    resend.emails.send({
      from: `Self-Tape Reader <${fromEmail}>`,
      to: reader.email,
      subject: readerSubject,
      html: readerBody,
    }),
  ]);

  console.log(`[cancellation-emails] Sent to actor (${actor.email}) and reader (${reader.email})`);
}