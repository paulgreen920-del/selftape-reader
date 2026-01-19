import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  req: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = currentUser.id;

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ ok: false, error: 'Missing connection ID' }, { status: 400 });
    }

    const connection = await prisma.iCalConnection.findUnique({ where: { id } });
    if (!connection || connection.userId !== userId) {
      return NextResponse.json({ ok: false, error: 'Not found or not authorized' }, { status: 404 });
    }

    await prisma.iCalConnection.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Server error';
    console.error('[DELETE /api/calendar/ical/[id]] error:', err);
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}