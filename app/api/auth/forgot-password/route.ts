import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendPasswordResetEmail } from '@/lib/email';
import { verifyRecaptcha } from '@/lib/recaptcha';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const { email, recaptchaToken } = await req.json();
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Verify reCAPTCHA
    const recaptchaResult = await verifyRecaptcha(recaptchaToken, 'forgot_password', 0.5);
    if (!recaptchaResult.success) {
      console.log('[forgot-password] reCAPTCHA failed:', recaptchaResult);
      return NextResponse.json(
        { error: 'Security verification failed' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // For security, do not reveal if user exists
      return NextResponse.json({ ok: true });
    }

    // Generate a secure token
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

    // Store token and expiry in DB
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt: expires,
      },
    });

    // Send email with reset link
    const result = await sendPasswordResetEmail(user.email, token);

    if (!result.success) {
      console.error('[forgot-password] Email send failed:', result.error);
      // Still return success to user for security
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[forgot-password] Error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
