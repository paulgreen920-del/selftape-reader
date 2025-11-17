import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendBookingConfirmation(booking: any) {
  const fromEmail = process.env.FROM_EMAIL || 'Reader Marketplace <booking@selftape-reader.com>';
  
    console.log('[Email] Starting to send confirmation emails for booking:', booking.id);
    console.log('[Email] RESEND_API_KEY present:', !!process.env.RESEND_API_KEY);
    console.log('[Email] FROM_EMAIL:', fromEmail);
  
  try {
    const { reader, actor } = booking;
    
    // Build action links
    const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';
    const cancelUrl = `${baseUrl}/bookings/${booking.id}/cancel`;
    const rescheduleUrl = `${baseUrl}/bookings/${booking.id}/reschedule`;
    const reportUrl = `${baseUrl}/bookings/${booking.id}/report`;
    const startTime = new Date(booking.startTime);
    const endTime = new Date(booking.endTime);
    
    const formattedStart = startTime.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: reader.timezone || 'America/New_York'
    });

    // Build sides information
    let sidesInfo = '';
    if (booking.sidesUrl || booking.sidesLink) {
      sidesInfo = '\n\n**Audition Sides:**\n';
      if (booking.sidesUrl) {
        const fullUrl = booking.sidesUrl.startsWith('http') ? booking.sidesUrl : `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}${booking.sidesUrl}`;
        sidesInfo += `- Document: ${fullUrl}`;
        if (booking.sidesFileName) {
          sidesInfo += ` (${booking.sidesFileName})`;
        }
        sidesInfo += '\n';
      }
      if (booking.sidesLink) {
        sidesInfo += `- Link: ${booking.sidesLink}\n`;
      }
    }

    // Build audition sides section with links
    let sidesSection = '';
    if (booking.sidesUrl || booking.sidesLink) {
      sidesSection = '<div style="background:#f3f4f6;padding:16px;border-radius:8px;margin:20px 0;border-left:4px solid #10b981;">';
      sidesSection += '<h3 style="margin-top:0;color:#047857;">📄 Audition Sides</h3>';
      
      if (booking.sidesUrl) {
        const fullUrl = booking.sidesUrl.startsWith('http') ? booking.sidesUrl : `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}${booking.sidesUrl}`;
        sidesSection += `<p style="margin:8px 0;"><strong>Document:</strong> <a href="${fullUrl}" style="color:#059669;text-decoration:none;">${booking.sidesFileName || 'Download PDF'}</a></p>`;
      }
      
      if (booking.sidesLink) {
        sidesSection += `<p style="margin:8px 0;"><strong>Link:</strong> <a href="${booking.sidesLink}" style="color:#059669;text-decoration:none;">${booking.sidesLink}</a></p>`;
      }
      
      sidesSection += '</div>';
    }

    // Build calendar links
    const calendarSection = `
      <div style="background:#eff6ff;padding:16px;border-radius:8px;margin:20px 0;border-left:4px solid #3b82f6;">
        <h3 style="margin-top:0;color:#1e40af;">📅 Add to Your Calendar</h3>
        <p style="margin:8px 0;">Don't miss your session! Click below to add this to your calendar:</p>
        <p style="margin:12px 0;">
          <a href="https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`Reading Session with ${actor.name}`)}&dates=${startTime.toISOString().replace(/[-:]/g, '').split('.')[0]}Z/${endTime.toISOString().replace(/[-:]/g, '').split('.')[0]}Z&details=${encodeURIComponent(`Reading session with ${actor.name}. Meeting: ${booking.meetingUrl || 'TBD'}`)}" style="display:inline-block;background:#dc2626;color:white;padding:10px 20px;text-decoration:none;border-radius:6px;margin:4px;">Google Calendar</a>
          <a href="https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(`Reading Session with ${actor.name}`)}&startdt=${startTime.toISOString()}&enddt=${endTime.toISOString()}&body=${encodeURIComponent(`Reading session with ${actor.name}`)}" style="display:inline-block;background:#0078d4;color:white;padding:10px 20px;text-decoration:none;border-radius:6px;margin:4px;">Outlook</a>
        </p>
      </div>
    `;

    // Email to Reader
    console.log('[Email] Sending email to reader:', reader.email);
    const readerEmailResult = await resend.emails.send({
      from: fromEmail,
      to: reader.email,
      subject: `New Reading Session Booked - ${actor.name}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
          <h2 style="color:#047857;">New Reading Session Confirmed</h2>
          <p>Hi ${reader.displayName || reader.name},</p>
          <p>You have a new reading session booked:</p>
          
          <div style="background:#f9fafb;padding:16px;border-radius:8px;margin:16px 0;">
            <h3 style="margin-top:0;">Session Details</h3>
            <ul style="list-style:none;padding:0;">
              <li style="padding:4px 0;"><strong>Actor:</strong> ${actor.name} (${actor.email})</li>
              <li style="padding:4px 0;"><strong>Date & Time:</strong> ${formattedStart}</li>
              <li style="padding:4px 0;"><strong>Duration:</strong> ${booking.durationMinutes} minutes</li>
              <li style="padding:4px 0;"><strong>Your Earnings:</strong> <span style="color:#047857;font-weight:bold;">$${((booking.readerEarningsCents || 0) / 100).toFixed(2)}</span></li>
            </ul>
          </div>

          ${booking.meetingUrl ? `<div style="background:#dbeafe;padding:16px;border-radius:8px;margin:16px 0;"><p style="margin:0;"><strong>🎥 Meeting Link:</strong> <a href="${booking.meetingUrl}" style="color:#2563eb;">${booking.meetingUrl}</a></p></div>` : ''}
          
          ${sidesSection}
          
          <div style="background:#fee;padding:16px;border-radius:8px;margin:20px 0;border-left:4px solid #dc2626;">
            <h3 style="margin-top:0;color:#991b1b;">⚠️ Important Cancellation Policy</h3>
            <ul style="font-size:14px;color:#991b1b;line-height:1.6;margin:8px 0;padding-left:20px;">
              <li><strong>Cancel 24+ hours before:</strong> No penalty, actor gets full refund</li>
              <li><strong>Cancel under 24 hours:</strong> Warning issued, may lead to suspension</li>
              <li><strong>No-show:</strong> Immediate 14-day suspension + penalty</li>
              <li><strong>Late (5+ min):</strong> Session auto-extends, counts toward reliability score</li>
            </ul>
            <p style="margin:12px 0 0 0;font-size:13px;color:#991b1b;">
              Your reliability score affects your visibility on the platform. Maintain 95%+ attendance rate to stay in good standing.
            </p>
            <p style="margin:12px 0 0 0;">
              <a href="${rescheduleUrl}" style="display:inline-block;background:#047857;color:white;padding:8px 16px;text-decoration:none;border-radius:4px;margin:4px 4px 4px 0;">Reschedule Session</a>
              <a href="${cancelUrl}" style="display:inline-block;background:#dc2626;color:white;padding:8px 16px;text-decoration:none;border-radius:4px;margin:4px;">Cancel Booking</a>
            </p>
          </div>
          
          ${calendarSection}
          
          <div style="background:#f3f4f6;padding:12px;border-radius:8px;margin:16px 0;">
            <p style="margin:0;font-size:13px;color:#6b7280;">
              <strong>Need to report an issue?</strong> If you experience any problems during your session, 
              <a href="${reportUrl}" style="color:#2563eb;">click here to report</a>.
            </p>
          </div>
          
          <p style="color:#6b7280;font-size:14px;margin-top:24px;">This event has been added to your Google Calendar if you have calendar sync enabled.</p>
          
          <p>Best regards,<br><strong>Self Tape Reader Team</strong></p>
        </div>
      `
    });
    console.log('[Email] Reader email sent, ID:', readerEmailResult.data?.id);

    // Email to Actor
    console.log('[Email] Sending email to actor:', actor.email);
    const actorEmailResult = await resend.emails.send({
      from: fromEmail,
      to: actor.email,
      subject: `Reading Session Confirmed with ${reader.displayName || reader.name}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
          <h2 style="color:#0891b2;">🎬 Reading Session Confirmed</h2>
          <p>Hi ${actor.name},</p>
          <p>Your reading session has been confirmed:</p>
          
          <div style="background:#f9fafb;padding:16px;border-radius:8px;margin:16px 0;">
            <h3 style="margin-top:0;">Session Details</h3>
            <ul style="list-style:none;padding:0;">
              <li style="padding:4px 0;"><strong>Reader:</strong> ${reader.displayName || reader.name}</li>
              <li style="padding:4px 0;"><strong>Date & Time:</strong> ${formattedStart}</li>
              <li style="padding:4px 0;"><strong>Duration:</strong> ${booking.durationMinutes} minutes</li>
            </ul>
          </div>

          ${booking.meetingUrl ? `<div style="background:#dbeafe;padding:16px;border-radius:8px;margin:16px 0;"><p style="margin:0;"><strong>🎥 Meeting Link:</strong> <a href="${booking.meetingUrl}" style="color:#2563eb;">${booking.meetingUrl}</a></p></div>` : ''}
          
          ${sidesSection}
          
          <div style="background:#fff3cd;padding:16px;border-radius:8px;margin:20px 0;border-left:4px solid #ffc107;">
            <h3 style="margin-top:0;color:#856404;">📋 Cancellation & Reschedule Policy</h3>
            <ul style="font-size:14px;color:#856404;line-height:1.6;margin:8px 0;padding-left:20px;">
              <li><strong>Cancel 2+ hours before:</strong> Full refund minus ~$2 processing fee</li>
              <li><strong>Cancel under 2 hours:</strong> No refund (reader gets paid)</li>
              <li><strong>Reschedule:</strong> Free up to 2 hours before session</li>
              <li><strong>No-show:</strong> No refund</li>
            </ul>
            <p style="margin:12px 0 0 0;">
              <a href="${rescheduleUrl}" style="display:inline-block;background:#0891b2;color:white;padding:8px 16px;text-decoration:none;border-radius:4px;margin:4px 4px 4px 0;">Reschedule Session</a>
              <a href="${cancelUrl}" style="display:inline-block;background:#dc2626;color:white;padding:8px 16px;text-decoration:none;border-radius:4px;margin:4px;">Cancel Booking</a>
            </p>
          </div>
          
          ${calendarSection}
          
          <div style="background:#fef3c7;padding:16px;border-radius:8px;margin:20px 0;border-left:4px solid #f59e0b;">
            <p style="margin:0;"><strong>💡 Pro Tip:</strong> Test your camera and microphone before the session starts!</p>
          </div>
          
          <div style="background:#f3f4f6;padding:12px;border-radius:8px;margin:16px 0;">
            <p style="margin:0;font-size:13px;color:#6b7280;">
              <strong>Need to report an issue?</strong> If you experience any problems during your session (technical issues, no-show, etc.), 
              <a href="${reportUrl}" style="color:#2563eb;">click here to report</a>.
            </p>
          </div>
          
          <p style="color:#6b7280;font-size:14px;">We'll send you a reminder before your session starts.</p>
          
          <p>Break a leg! 🍀<br><strong>Self Tape Reader Team</strong></p>
        </div>
      `
    });
    console.log('[Email] Actor email sent, ID:', actorEmailResult.data?.id);

    console.log(`[Email] ✅ Successfully sent confirmation emails for booking ${booking.id}`);
  } catch (error) {
    console.error('[Email] ❌ Failed to send confirmation emails:', error);
    if (error instanceof Error) {
      console.error('[Email] Error message:', error.message);
      console.error('[Email] Error stack:', error.stack);
    }
    // Don't throw - email failure shouldn't break the booking flow
  }
}
