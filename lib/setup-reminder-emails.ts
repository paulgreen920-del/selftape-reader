import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface SetupStatus {
  hasProfile: boolean;
  hasHeadshot: boolean;
  hasCalendar: boolean;
  hasAvailability: boolean;
  hasStripe: boolean;
}

interface ReaderInfo {
  email: string;
  displayName: string | null;
  name: string;
}

function getMissingStepsList(status: SetupStatus): string {
  const missing: string[] = [];
  
  if (!status.hasProfile) missing.push('Complete your profile (name & bio)');
  if (!status.hasHeadshot) missing.push('Upload your headshot');
  if (!status.hasCalendar) missing.push('Connect your calendar');
  if (!status.hasAvailability) missing.push('Set your availability');
  if (!status.hasStripe) missing.push('Connect Stripe to get paid');
  
  return missing.map(item => `<li style="margin-bottom:8px;">❌ ${item}</li>`).join('');
}

function getCompletedStepsList(status: SetupStatus): string {
  const completed: string[] = [];
  
  if (status.hasProfile) completed.push('Profile complete');
  if (status.hasHeadshot) completed.push('Headshot uploaded');
  if (status.hasCalendar) completed.push('Calendar connected');
  if (status.hasAvailability) completed.push('Availability set');
  if (status.hasStripe) completed.push('Stripe connected');
  
  if (completed.length === 0) return '';
  
  return completed.map(item => `<li style="margin-bottom:4px;color:#059669;">✓ ${item}</li>`).join('');
}

function getCompletedCount(status: SetupStatus): number {
  return [
    status.hasProfile,
    status.hasHeadshot,
    status.hasCalendar,
    status.hasAvailability,
    status.hasStripe,
  ].filter(Boolean).length;
}

export async function sendSetupReminder(
  reader: ReaderInfo,
  status: SetupStatus,
  reminderNumber: 1 | 2 | 3
): Promise<{ success: boolean; error?: string }> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';
    const dashboardUrl = `${baseUrl}/dashboard`;
    const fromEmail = process.env.FROM_EMAIL || 'onboarding@resend.dev';
    const name = reader.displayName || reader.name || 'there';
    const completedCount = getCompletedCount(status);
    
    // Different subject lines for each reminder
    const subjects: Record<number, string> = {
      1: "Let's get you set up! 🎬",
      2: `You're ${completedCount}/5 of the way there!`,
      3: "We'd love to have you reading — here's what's left",
    };
    
    // Different intros for each reminder
    const intros: Record<number, string> = {
      1: `
        <p>Thanks for signing up as a reader on Self Tape Reader! We're excited to have you.</p>
        <p>You're just a few steps away from being able to help actors with their self-tapes (and earn money doing it).</p>
      `,
      2: `
        <p>You started setting up your reader profile — nice! You're <strong>${completedCount}/5</strong> of the way there.</p>
        <p>Once you complete your setup, actors will be able to book sessions with you.</p>
      `,
      3: `
        <p>We noticed you haven't finished setting up your reader profile yet. No pressure — but we'd love to have you!</p>
        <p>There are actors looking for readers right now. Here's what's left to complete:</p>
      `,
    };
    
    const completedList = getCompletedStepsList(status);
    const completedSection = completedList ? `
      <div style="margin-bottom:16px;">
        <p style="margin-bottom:8px;font-weight:600;color:#059669;">What you've done:</p>
        <ul style="list-style:none;padding:0;margin:0;">
          ${completedList}
        </ul>
      </div>
    ` : '';

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1f2937;">
        <div style="background:linear-gradient(135deg,#047857,#059669);padding:24px;border-radius:12px 12px 0 0;">
          <h1 style="color:white;margin:0;font-size:24px;">Self Tape Reader</h1>
        </div>
        
        <div style="background:#ffffff;padding:32px;border:1px solid #e5e7eb;border-top:none;">
          <h2 style="color:#047857;margin-top:0;">Hey ${name}! 👋</h2>
          
          ${intros[reminderNumber]}
          
          ${completedSection}
          
          <div style="background:#fef2f2;padding:20px;border-radius:8px;margin:24px 0;">
            <p style="margin:0 0 12px 0;font-weight:600;color:#991b1b;">Here's what's left:</p>
            <ul style="list-style:none;padding:0;margin:0;">
              ${getMissingStepsList(status)}
            </ul>
          </div>
          
          <div style="text-align:center;margin:32px 0;">
            <a href="${dashboardUrl}" style="display:inline-block;background:#047857;color:white;padding:16px 40px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px;">
              Complete My Setup
            </a>
          </div>
          
          <div style="background:#f0fdf4;padding:16px;border-radius:8px;border-left:4px solid #047857;">
            <p style="margin:0;font-size:14px;color:#166534;">
              <strong>💡 Why finish?</strong> Readers on our platform help actors nail their auditions — and earn money for every session. It only takes a few minutes to complete your setup.
            </p>
          </div>
        </div>
        
        <div style="background:#f9fafb;padding:20px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:none;text-align:center;">
          <p style="margin:0;font-size:14px;color:#6b7280;">
            Questions? Just reply to this email.
          </p>
          <p style="margin:8px 0 0 0;font-size:12px;color:#9ca3af;">
            Self Tape Reader — Actors helping actors
          </p>
        </div>
      </div>
    `;

    await resend.emails.send({
      from: fromEmail,
      to: reader.email,
      subject: `${subjects[reminderNumber]} - Self Tape Reader`,
      html,
    });

    console.log(`[Email] Sent setup reminder #${reminderNumber} to ${reader.email}`);
    return { success: true };
  } catch (error: any) {
    console.error(`[Email] Failed to send setup reminder to ${reader.email}:`, error);
    return { success: false, error: error.message };
  }
}