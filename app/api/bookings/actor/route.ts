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

    // Get all bookings for this actor
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

    // Transform to expected format
    const transformedBookings = bookings.map((b: any) => ({
      id: b.id,
      readerId: b.readerId,
      readerName: b.reader.displayName || b.reader.name,
      startTime: b.startTime.toISOString(),
      endTime: b.endTime.toISOString(),
      status: b.status,
      totalCents: b.totalCents,
      meetingUrl: b.meetingUrl,
      durationMinutes: b.durationMinutes,
    }));

    return NextResponse.json({ ok: true, bookings: transformedBookings });
  } catch (err: any) {
    console.error("[GET /api/bookings/actor] Error:", err);
    return NextResponse.json({ ok: false, error: "Failed to load bookings" }, { status: 500 });
  }
}
