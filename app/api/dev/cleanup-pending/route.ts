import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    
    const result = await prisma.booking.deleteMany({
      where: {
        status: 'PENDING',
        createdAt: { lt: fifteenMinutesAgo }
      }
    });
    
    return NextResponse.json({ 
      ok: true, 
      deleted: result.count,
      message: `Deleted ${result.count} expired PENDING bookings` 
    });
  } catch (error: any) {
    console.error('[cleanup-pending] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
