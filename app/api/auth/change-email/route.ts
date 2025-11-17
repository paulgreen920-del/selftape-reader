import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Email sending function
async function sendEmailChangeVerification({
  oldEmail,
  newEmail,
  userName,
  token,
}: {
  oldEmail: string;
  newEmail: string;
  userName: string;
  token: string;
}) {
  const verificationUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/auth/verify-email-change?token=${token}`;

  // Send to new email (verification)
  await resend.emails.send({
    from: 'Self-Tape Reader <noreply@selftapereader.com>',
    to: newEmail,
    subject: 'Verify Your New Email Address',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Email Address Change Verification</h2>
        <p>Hi ${userName},</p>
        <p>You requested to change your email address from <strong>${oldEmail}</strong> to <strong>${newEmail}</strong>.</p>
        <p>To complete this change, please click the verification link below:</p>
        <div style="margin: 30px 0;">
          <a href="${verificationUrl}" 
             style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Verify New Email Address
          </a>
        </div>
        <p><strong>This link will expire in 24 hours.</strong></p>
        <p>If you didn't request this change, please ignore this email. Your account email will remain unchanged.</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 14px;">
          If the button doesn't work, copy and paste this URL into your browser:<br>
          <a href="${verificationUrl}">${verificationUrl}</a>
        </p>
      </div>
    `,
  });

  // Send notification to old email
  await resend.emails.send({
    from: 'Self-Tape Reader <noreply@selftapereader.com>',
    to: oldEmail,
    subject: 'Email Address Change Request',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Email Address Change Request</h2>
        <p>Hi ${userName},</p>
        <p>Someone requested to change the email address for your Self-Tape Reader account from <strong>${oldEmail}</strong> to <strong>${newEmail}</strong>.</p>
        <p>A verification email has been sent to the new email address. The change will only be completed if the new email is verified within 24 hours.</p>
        <p><strong>If you didn't request this change:</strong></p>
        <ul>
          <li>Your account is still secure</li>
          <li>No action is needed from you</li>
          <li>The change will not be completed without verification</li>
          <li>Consider changing your password if you're concerned</li>
        </ul>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 14px;">
          If you have concerns about your account security, please contact our support team.
        </p>
      </div>
    `,
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { currentPassword, newEmail } = body;

    if (!currentPassword || !newEmail) {
      return NextResponse.json(
        { error: "Current password and new email are required" },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Get user from session
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session");

    if (!sessionCookie?.value) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const sessionData = JSON.parse(sessionCookie.value);
    const user = await prisma.user.findUnique({
      where: { id: sessionData.userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 400 }
      );
    }

    // Check if new email is already in use
    const existingUser = await prisma.user.findUnique({
      where: { email: newEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "This email address is already registered" },
        { status: 400 }
      );
    }

    // Check for existing pending email change request
    const existingRequest = await prisma.email_change_requests.findFirst({
      where: { 
        userId: user.id,
        expiresAt: { gte: new Date() }
      }
    });

    if (existingRequest) {
      return NextResponse.json(
        { error: "You already have a pending email change request. Please check your email or wait for it to expire." },
        { status: 400 }
      );
    }

    // Generate verification token
    const verificationToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create email change request
    const changeRequest = await prisma.email_change_requests.create({
      data: {
        id: `email_change_${Date.now()}_${user.id}`,
        userId: user.id,
        oldEmail: user.email,
        newEmail,
        token: verificationToken,
        expiresAt,
        updatedAt: new Date(),
      },
    });

    // Send verification emails
    try {
      await sendEmailChangeVerification({
        oldEmail: user.email,
        newEmail,
        userName: user.name,
        token: verificationToken,
      });
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Clean up the change request if email sending fails
      await prisma.email_change_requests.delete({
        where: { id: changeRequest.id }
      });
      return NextResponse.json(
        { error: "Failed to send verification email. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: "Verification email sent to your new email address"
    });

  } catch (error) {
    console.error("[POST /api/auth/change-email] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}