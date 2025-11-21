import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
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
