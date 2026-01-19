import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/user/become-reader
 * Transitions a user from ACTOR to READER role to begin reader onboarding.
 * Does NOT delete any data - only changes role.
 */
export async function POST() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });
    }

    const userId = currentUser.id;

    // Get current user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ ok: false, error: 'User not found' }, { status: 404 });
    }

    // If already a reader, just return success
    if (user.role === 'READER') {
      return NextResponse.json({ 
        ok: true, 
        message: 'Already a reader',
        role: 'READER',
      });
    }

    // Update role to READER
    // Note: We do NOT set isActive yet - that happens at the end of reader onboarding
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        role: 'READER',
        // isActive stays false until they complete onboarding and "Go Live"
      },
    });

    console.log(`[become-reader] User ${userId} transitioned from ACTOR to READER`);

    return NextResponse.json({
      ok: true,
      message: 'You are now starting reader onboarding',
      role: updatedUser.role,
    });

  } catch (err: any) {
    console.error('[become-reader] Error:', err);
    return NextResponse.json(
      { ok: false, error: err.message || 'Server error' },
      { status: 500 }
    );
  }
}
