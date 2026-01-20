import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface BookingWithUsers {
  id: string;
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
  meetingUrl: string | null;
  notes: string | null;
  sidesUrl: string | null;
  sidesLink: string | null;
  User_Booking_readerIdToUser: {
    id: string;
    name: string;
    displayName: string | null;
    email: string;
    timezone: string | null;
  };
  User_Booking_actorIdToUser: {
    id: string;
    name: string;
    email: string;
    timezone: string | null;
  };
}

export async function sendBookingReminders(
  booking: BookingWithUsers,
  reminderType: '24h' | '1h'
) {
  const fromAddress = process.env.FROM_EMAIL_ADDRESS || 'noreply@selftapereader.com';
  const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://selftapereader.com';

  const reader = booking.User_Booking_readerIdToUser;
  const actor = booking.User_Booking_actorIdToUser;

  if (!reader || !actor) {
    console.error(`[Reminder] Missing reader or actor for booking ${booking.id}`);
    return;
  }

  const startTime = new Date(booking.startTime);

  // Format time for reader's timezone
  const readerFormattedTime = startTime.toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: reader.timezone || 'America/New_York'
  });

  // Format time for actor's timezone
  const actorFormattedTime = startTime.toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: actor.timezone || 'America/New_York'
  });

  const reminderText = reminderType === '24h' ? '24 hours' : '1 hour';
  const urgencyColor = reminderType === '24h' ? '#3b82f6' : '#f59e0b';
  const urgencyBg = reminderType === '24h' ? '#eff6ff' : '#fef3c7';

  console.log(`[Reminder] Sending ${reminderType} reminder for booking ${booking.id}`);

  // Get sides info
  const sidesUrl = booking.sidesUrl || booking.sidesLink;

  // Email to Reader
  try {
    await resend.emails.send({
      from: `Self-Tape Reader <${fromAddress}>`,
      to: reader.email,
      subject: `⏰ Reminder: Session with ${actor.name} in ${reminderText}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
          <div style="background:${urgencyBg};padding:20px;border-radius:8px;margin-bottom:20px;border-left:4px solid ${urgencyColor};">
            <h2 style="margin:0 0 8px 0;color:#1f2937;">⏰ Session Starting in ${reminderText}</h2>
            <p style="margin:0;color:#4b5563;">Don't forget your upcoming reading session!</p>
          </div>
          
          <p>Hi ${reader.displayName || reader.name},</p>
          <p>This is a reminder that you have a reading session coming up:</p>
          
          <div style="background:#f9fafb;padding:16px;border-radius:8px;margin:16px 0;">
            <ul style="list-style:none;padding:0;margin:0;">
              <li style="padding:8px 0;"><strong>Actor:</strong> ${actor.name}</li>
              <li style="padding:8px 0;"><strong>Date & Time:</strong> ${readerFormattedTime}</li>
              <li style="padding:8px 0;"><strong>Duration:</strong> ${booking.durationMinutes} minutes</li>
            </ul>
          </div>

          ${sidesUrl ? `
            <div style="background:#f0fdf4;padding:16px;border-radius:8px;margin:16px 0;border-left:4px solid #22c55e;">
              <p style="margin:0;"><strong>📄 Audition Sides:</strong></p>
              <a href="${sidesUrl}" style="color:#16a34a;word-break:break-all;">${sidesUrl}</a>
            </div>
          ` : ''}

          ${booking.meetingUrl ? `
            <div style="background:#dbeafe;padding:16px;border-radius:8px;margin:16px 0;text-align:center;">
              <p style="margin:0 0 12px 0;"><strong>🎥 Meeting Link:</strong></p>
              <a href="${booking.meetingUrl}" style="display:inline-block;background:#2563eb;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold;">Join Session</a>
            </div>
          ` : ''}
          
          <div style="background:#fef3c7;padding:12px;border-radius:8px;margin:16px 0;">
            <p style="margin:0;font-size:14px;color:#92400e;">
              <strong>💡 Reminder:</strong> Please be ready a few minutes early. Late arrivals affect your reliability score.
            </p>
          </div>
          
          <p>Best regards,<br><strong>Self Tape Reader Team</strong></p>
        </div>
      `
    });
    console.log(`[Reminder] ✅ Reader email sent for booking ${booking.id}`);
  } catch (error) {
    console.error(`[Reminder] ❌ Failed to send reader email:`, error);
  }

  // Email to Actor
  try {
    await resend.emails.send({
      from: `Self-Tape Reader <${fromAddress}>`,
      to: actor.email,
      subject: `⏰ Reminder: Session with ${reader.displayName || reader.name} in ${reminderText}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
          <div style="background:${urgencyBg};padding:20px;border-radius:8px;margin-bottom:20px;border-left:4px solid ${urgencyColor};">
            <h2 style="margin:0 0 8px 0;color:#1f2937;">⏰ Session Starting in ${reminderText}</h2>
            <p style="margin:0;color:#4b5563;">Your reading session is coming up soon!</p>
          </div>
          
          <p>Hi ${actor.name},</p>
          <p>This is a reminder about your upcoming reading session:</p>
          
          <div style="background:#f9fafb;padding:16px;border-radius:8px;margin:16px 0;">
            <ul style="list-style:none;padding:0;margin:0;">
              <li style="padding:8px 0;"><strong>Reader:</strong> ${reader.displayName || reader.name}</li>
              <li style="padding:8px 0;"><strong>Date & Time:</strong> ${actorFormattedTime}</li>
              <li style="padding:8px 0;"><strong>Duration:</strong> ${booking.durationMinutes} minutes</li>
            </ul>
          </div>

          ${booking.meetingUrl ? `
            <div style="background:#dbeafe;padding:16px;border-radius:8px;margin:16px 0;text-align:center;">
              <p style="margin:0 0 12px 0;"><strong>🎥 Meeting Link:</strong></p>
              <a href="${booking.meetingUrl}" style="display:inline-block;background:#2563eb;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold;">Join Session</a>
            </div>
          ` : ''}
          
          <div style="background:#d1fae5;padding:12px;border-radius:8px;margin:16px 0;">
            <p style="margin:0;font-size:14px;color:#065f46;">
              <strong>🎬 Tip:</strong> Have your sides ready and test your camera/mic before the session starts!
            </p>
          </div>
          
          <p>Break a leg! 🍀<br><strong>Self Tape Reader Team</strong></p>
        </div>
      `
    });
    console.log(`[Reminder] ✅ Actor email sent for booking ${booking.id}`);
  } catch (error) {
    console.error(`[Reminder] ❌ Failed to send actor email:`, error);
  }
}