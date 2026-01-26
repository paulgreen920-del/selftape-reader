import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  // Check if user is admin
  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });

  if (!currentUser?.isAdmin) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  const role = searchParams.get('role');
  const status = searchParams.get('status');
  const subscription = searchParams.get('subscription');
  const search = searchParams.get('search');

  const where: any = {};

  if (role) {
    where.role = role;
  }

  if (status === 'active') {
    where.isActive = true;
  } else if (status === 'inactive') {
    where.isActive = false;
  }

  if (subscription === 'active') {
    where.subscriptionStatus = 'active';
  } else if (subscription === 'inactive') {
    where.subscriptionStatus = 'inactive';
  } else if (subscription === 'canceled') {
    where.subscriptionStatus = 'canceled';
  } else if (subscription === 'none') {
    where.subscriptionStatus = null;
  }

  if (search) {
    where.OR = [
      { email: { contains: search, mode: 'insensitive' } },
      { displayName: { contains: search, mode: 'insensitive' } },
      { name: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        displayName: true,
        role: true,
        isAdmin: true,
        isActive: true,
        subscriptionStatus: true,
        onboardingStep: true,
        headshotUrl: true,
        bio: true,
        phone: true,
        city: true,
        timezone: true,
        stripeAccountId: true,
        stripeCustomerId: true,
        subscriptionId: true,
        createdAt: true,
        updatedAt: true,
        // Include related data for reader status
        CalendarConnection: {
          select: {
            id: true,
            provider: true,
          },
        },
        ICalConnections: {
          select: {
            id: true,
            name: true,
          },
        },
        AvailabilityTemplate: {
          select: {
            id: true,
            isActive: true,
          },
        },
        AvailabilitySlot: {
          where: {
            startTime: { gte: new Date() },
            isBooked: false,
          },
          select: {
            id: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  // Transform users to include reader status
  const usersWithStatus = users.map((user) => {
    // Compute reader status for readers
    const readerStatus = user.role === 'READER' ? {
      hasProfile: !!(user.displayName && user.bio),
      hasHeadshot: !!user.headshotUrl,
      hasCalendar: !!(user.CalendarConnection || user.ICalConnections.length > 0),
      calendarType: user.CalendarConnection?.provider || 
                    (user.ICalConnections.length > 0 ? 'iCal' : null),
      hasAvailability: user.AvailabilityTemplate.some(t => t.isActive) || 
                       user.AvailabilitySlot.length > 0,
      availabilityTemplateCount: user.AvailabilityTemplate.filter(t => t.isActive).length,
      upcomingSlotCount: user.AvailabilitySlot.length,
      hasStripe: !!user.stripeAccountId,
      isActivated: user.isActive,
    } : null;

    // Clean up the response
    const { CalendarConnection, ICalConnections, AvailabilityTemplate, AvailabilitySlot, ...userData } = user;

    return {
      ...userData,
      readerStatus,
    };
  });

  return NextResponse.json({
    ok: true,
    users: usersWithStatus,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });

  if (!currentUser?.isAdmin) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  const { userId, updates } = await req.json();

  if (!userId) {
    return NextResponse.json({ ok: false, error: 'User ID required' }, { status: 400 });
  }

  // Filter allowed fields
  const allowedFields = [
    'email', 'displayName', 'role', 'isActive', 'subscriptionStatus',
    'onboardingStep', 'headshotUrl', 'bio', 'phone', 'city', 'timezone',
    'stripeAccountId', 'stripeCustomerId', 'subscriptionId',
  ];

  const filteredUpdates: any = {};
  for (const key of allowedFields) {
    if (updates[key] !== undefined) {
      filteredUpdates[key] = updates[key];
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: filteredUpdates,
  });

  return NextResponse.json({ ok: true, user: updatedUser });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });

  if (!currentUser?.isAdmin) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ ok: false, error: 'User ID required' }, { status: 400 });
  }

  // Prevent deleting yourself
  if (userId === session.user.id) {
    return NextResponse.json({ ok: false, error: 'Cannot delete yourself' }, { status: 400 });
  }

  await prisma.user.delete({
    where: { id: userId },
  });

  return NextResponse.json({ ok: true });
}