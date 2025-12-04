// lib/email-verification.ts
import { prisma } from './prisma';
import { Resend } from 'resend';
import crypto from 'crypto';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendVerificationEmail(email: string, name: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Generate verification token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store verification token
    // @ts-ignore - TODO: Remove after running `npx prisma generate`
    await prisma.emailVerification.create({
      data: {
        id: `verify_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`,
        email,
        token,
        expiresAt,
      }
    });

    // Send email
    const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';
    const verificationUrl = `${baseUrl}/api/auth/verify-email?token=${token}`;
    const fromEmail = process.env.FROM_EMAIL || 'no-reply@selftapereader.com';

    await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: 'Verify your email address',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
          <h2 style="color:#047857;">
            <img src="${baseUrl}/uploads/stripiconsmartphone.png" alt="Self Tape Reader" style="height:24px;vertical-align:middle;margin-right:8px;">
            Welcome to Self Tape Reader!
          </h2>
          <p>Hi ${name},</p>
          <p>Thanks for signing up! To complete your registration and start using our platform, please verify your email address by clicking the button below:</p>
          <div style="text-align:center;margin:32px 0;">
            <a href="${verificationUrl}" target="_self" style="display:inline-block;background:#047857;color:white;padding:14px 32px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px;">
              Verify Email Address
            </a>
          </div>
          <p style="color:#6b7280;font-size:14px;">If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="color:#2563eb;font-size:14px;word-break:break-all;">${verificationUrl}</p>
          <div style="background:#fef3c7;padding:16px;border-radius:8px;margin:24px 0;border-left:4px solid #f59e0b;">
            <p style="margin:0;font-size:14px;color:#92400e;">
              <strong>⚠️ This link expires in 24 hours.</strong> If it expires, you can request a new verification email from the signup page.
            </p>
          </div>
          <p style="color:#6b7280;font-size:14px;margin-top:24px;">
            If you didn't create an account with us, please ignore this email.
          </p>
          <p>Best regards,<br><strong>Self Tape Reader Team</strong></p>
        </div>
      `
    });

    console.log(`[Email Verification] Sent verification email to ${email}`);
    return { success: true };
  } catch (error: any) {
    console.error('[Email Verification] Failed to send verification email:', error);
    return { success: false, error: error.message };
  }
}

export async function verifyEmailToken(token: string): Promise<{ success: boolean; email?: string; user?: any; error?: string }> {
  try {
    // Find verification record
    // @ts-ignore - TODO: Remove after running `npx prisma generate`
    const verification = await prisma.emailVerification.findUnique({
      where: { token }
    });

    if (!verification) {
      return { success: false, error: 'Invalid verification link' };
    }

    if (verification.verified) {
      return { success: false, error: 'Email already verified' };
    }

    if (new Date() > verification.expiresAt) {
      return { success: false, error: 'Verification link has expired' };
    }

    // Mark as verified
    // @ts-ignore - TODO: Remove after running `npx prisma generate`
    await prisma.emailVerification.update({
      where: { token },
      data: {
        verified: true,
        verifiedAt: new Date()
      }
    });

    // Update user - emailVerified fields will be available after Prisma regeneration
    const updateData: any = {
      emailVerified: true,
      emailVerifiedAt: new Date()
    };
    await prisma.user.updateMany({
      where: { email: verification.email },
      data: updateData
    });

    // Get updated user
    const user = await prisma.user.findUnique({
      where: { email: verification.email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        onboardingStep: true,
      }
    });

    console.log(`[Email Verification] Successfully verified email: ${verification.email}`);
    return { success: true, email: verification.email, user };
  } catch (error: any) {
    console.error('[Email Verification] Error verifying token:', error);
    return { success: false, error: error.message };
  }
}
