// app/api/bookings/route.ts
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  // Temporary stub — we’ll wire to Prisma next
  const body = await req.json().catch(() => null);
  return NextResponse.json({ ok: true, received: body ?? null });
}
