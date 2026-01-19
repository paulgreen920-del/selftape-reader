import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-helpers';
import { sendVerificationEmail } from '@/lib/email-verification';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const userId = currentUser.id;
    if (!userId) {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      );
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (user.emailVerified) {
      return NextResponse.json(
        { error: 'Email already verified' },
        { status: 400 }
      );
    }

    // Invalidate old tokens
    // @ts-ignore - TODO: Remove after running `npx prisma generate`
    await prisma.emailVerification.updateMany({
      where: {
        email: user.email,
        verified: false,
      },
      data: {
        verified: true, // Mark as verified to prevent reuse
      },
    });

    // Send new verification email
    const result = await sendVerificationEmail(user.email, user.name);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send verification email' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Resend verification error:', error);
    return NextResponse.json(
      { error: 'An error occurred while resending verification email' },
      { status: 500 }
    );
  }
}
