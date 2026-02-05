import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * GET /api/user/profile
 * Fetch current user's profile information
 */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        email: true,
        displayName: true,
        name: true,
        phone: true,
        city: true,
        timezone: true,
        role: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, user }, { status: 200 });
  } catch (err: any) {
    console.error('[GET /api/user/profile] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/user/profile
 * Update current user's profile information
 */
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, email: true },
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await req.json();
    const { displayName, email, phone, city, timezone } = body;

    // Validate email if provided
    if (email && email !== currentUser.email) {
      // Check if email is already in use by another user
      const existingUser = await prisma.user.findUnique({
        where: { email: email },
      });

      if (existingUser && existingUser.id !== currentUser.id) {
        return NextResponse.json(
          { error: 'Email already in use by another account' },
          { status: 400 }
        );
      }

      // For email changes, you may want to implement verification
      // For now, we'll allow direct email changes
    }

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: currentUser.id },
      data: {
        displayName: displayName || null,
        email: email || currentUser.email,
        phone: phone || null,
        city: city || null,
        timezone: timezone || 'America/New_York',
        updatedAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        name: true,
        phone: true,
        city: true,
        timezone: true,
        role: true,
      },
    });

    return NextResponse.json({ ok: true, user: updatedUser }, { status: 200 });
  } catch (err: any) {
    console.error('[PUT /api/user/profile] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
