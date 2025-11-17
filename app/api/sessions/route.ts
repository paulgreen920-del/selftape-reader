import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session");

    if (!sessionCookie) {
      return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
    }

    const session = JSON.parse(sessionCookie.value);

    // Get all sessions for this actor (using booking table but returning as sessions)
    const bookings = await prisma.booking.findMany({
      where: { actorId: session.userId },
      include: {
        User_Booking_readerIdToUser: {
          select: {
            id: true,
            displayName: true,
            name: true,
          },
        },
      },
      orderBy: { startTime: 'desc' },
    });

    // Transform to expected format (sessions)
    const transformedSessions = bookings.map(b => ({
      id: b.id,
      readerId: b.readerId,
      readerName: b.User_Booking_readerIdToUser.displayName || b.User_Booking_readerIdToUser.name,
      startTime: b.startTime.toISOString(),
      endTime: b.endTime.toISOString(),
      status: b.status,
      totalCents: b.totalCents,
      meetingUrl: b.meetingUrl,
      durationMinutes: b.durationMinutes,
    }));

    return NextResponse.json({ ok: true, sessions: transformedSessions });
  } catch (err: any) {
    console.error("[GET /api/sessions] Error:", err);
    return NextResponse.json({ ok: false, error: "Failed to load sessions" }, { status: 500 });
  }
}