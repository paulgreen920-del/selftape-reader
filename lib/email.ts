import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendPasswordResetEmail(email: string, resetToken: string): Promise<{ success: boolean; error?: string }> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;
    const fromEmail = process.env.FROM_EMAIL || 'onboarding@resend.dev';

    await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: 'Reset Your Password - Self Tape Reader',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
          <h2 style="color:#047857;">Password Reset Request 🎬</h2>
          <p>Hi,</p>
          <p>You requested to reset your password for Self Tape Reader. Click the button below to create a new password:</p>
          
          <div style="text-align:center;margin:32px 0;">
            <a href="${resetUrl}" style="display:inline-block;background:#047857;color:white;padding:14px 32px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px;">
              Reset Password
            </a>
          </div>
          
          <p style="color:#6b7280;font-size:14px;">If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="color:#2563eb;font-size:14px;word-break:break-all;">${resetUrl}</p>
          
          <div style="background:#fef3c7;padding:16px;border-radius:8px;margin:24px 0;border-left:4px solid #f59e0b;">
            <p style="margin:0;font-size:14px;color:#92400e;">
              <strong>⚠️ This link expires in 1 hour.</strong> If you didn't request this, you can safely ignore this email.
            </p>
          </div>
          
          <p>Best regards,<br><strong>Self Tape Reader Team</strong></p>
        </div>
      `
    });

    console.log(`[Email] Sent password reset email to ${email}`);
    return { success: true };
  } catch (error: any) {
    console.error('[Email] Failed to send password reset email:', error);
    return { success: false, error: error.message };
  }
}