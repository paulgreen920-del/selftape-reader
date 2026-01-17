import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/reader/toggle-status
 * Toggles a reader's isActive status (visible/hidden in marketplace)
 * Does NOT delete any data or change role
 */
export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');

    if (!sessionCookie) {
      return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });
    }

    const session = JSON.parse(sessionCookie.value);
    const userId = session.userId;

    if (!userId) {
      return NextResponse.json({ ok: false, error: 'Invalid session' }, { status: 401 });
    }

    // Get request body
    const body = await req.json();
    const { isActive } = body;

    if (typeof isActive !== 'boolean') {
      return NextResponse.json({ ok: false, error: 'isActive must be a boolean' }, { status: 400 });
    }

    // Get current user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ ok: false, error: 'User not found' }, { status: 404 });
    }

    // Only readers can toggle status
    if (user.role !== 'READER') {
      return NextResponse.json({ ok: false, error: 'Only readers can toggle status' }, { status: 403 });
    }

    // Update status
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        isActive,
        // Note: We ONLY update isActive
        // We do NOT change role, subscriptionStatus, or any other fields
      },
    });

    console.log(`[toggle-status] User ${userId} set isActive to ${isActive}`);

    return NextResponse.json({
      ok: true,
      isActive: updatedUser.isActive,
      message: isActive ? 'Your profile is now visible' : 'Your profile is now hidden',
    });

  } catch (err: any) {
    console.error('[toggle-status] Error:', err);
    return NextResponse.json(
      { ok: false, error: err.message || 'Server error' },
      { status: 500 }
    );
  }
}
