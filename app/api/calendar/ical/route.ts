// app/api/calendar/ical/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-helpers';

// Helper to validate iCal URLs
function isValidIcalUrl(url: string): boolean {
  return (
    url.startsWith('webcal://') ||
    url.endsWith('.ics') ||
    url.includes('calendar.google.com') ||
    url.includes('icloud.com')
  );
}


export async function GET(req: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const userId = currentUser.id;

  const connections = await prisma.iCalConnection.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  });
  return NextResponse.json({ ok: true, connections });
}

export async function POST(req: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const userId = currentUser.id;

  const body = await req.json();
  const { name, url } = body;
  if (!name || !url) {
    return NextResponse.json({ ok: false, error: 'Missing name or url' }, { status: 400 });
  }
  if (!isValidIcalUrl(url)) {
    return NextResponse.json({ ok: false, error: 'Invalid iCal URL' }, { status: 400 });
  }
  const count = await prisma.iCalConnection.count({ where: { userId } });
  if (count >= 5) {
    return NextResponse.json({ ok: false, error: 'Maximum 5 calendars allowed' }, { status: 400 });
  }
  const connection = await prisma.iCalConnection.create({
    data: { userId, name, url },
  });
  return NextResponse.json({ ok: true, connection });
}
