import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * GET /api/user/profile
 * Fetch current user's profile information
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
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
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { displayName, phone, city, timezone } = body;

    // Update user profile (email changes handled separately via /api/auth/change-email)
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        displayName: displayName || null,
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
