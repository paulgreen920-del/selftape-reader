import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { sendVerificationEmail } from "@/lib/email-verification";
import { verifyRecaptcha } from '@/lib/recaptcha';

async function POST(req: Request) {
  try {
    const { email, password, name, role, recaptchaToken } = await req.json();

    if (!email || !password || !name) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Verify reCAPTCHA
    const recaptchaResult = await verifyRecaptcha(recaptchaToken, 'signup', 0.5);
    if (!recaptchaResult.success) {
      console.log('[signup] reCAPTCHA failed:', recaptchaResult);
      return NextResponse.json(
        { ok: false, error: 'Security verification failed' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { ok: false, error: "Email already registered" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate URL-safe user ID
    const crypto = require('crypto');
    const randomId = crypto.randomBytes(12).toString('base64url');
    const userId = `user_${Date.now()}_${randomId}`;

    // Create user
    const user = await prisma.user.create({
      data: {
        id: userId,
        email,
        password: hashedPassword,
        name,
        role: role || "ACTOR",
        updatedAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    // Send verification email (don't block signup on email failure)
    try {
      await sendVerificationEmail(user.email, user.name);
      console.log(`[signup] Verification email sent to ${user.email}`);
    } catch (error) {
      console.error('[signup] Failed to send verification email:', error);
      // Continue with signup even if email fails
    }

    // Return success - NextAuth signIn will be called on the client side
    return NextResponse.json({ 
      ok: true, 
      user,
    });
  } catch (err: any) {
    console.error("[signup] Error:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to create account" },
      { status: 500 }
    );
  }
}

export { POST };