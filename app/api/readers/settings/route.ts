import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { maxAdvanceBooking, minAdvanceHours, bookingBuffer } = body;

    // Get user from session
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session");

    if (!sessionCookie?.value) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const sessionData = JSON.parse(sessionCookie.value);
    const user = await prisma.user.findUnique({
      where: { id: sessionData.userId },
    });

    if (!user || (user.role !== 'READER' && user.role !== 'ADMIN')) {
      return NextResponse.json(
        { error: "Not authorized" },
        { status: 403 }
      );
    }

    // Update user settings
    await prisma.user.update({
      where: { id: user.id },
      data: {
        maxAdvanceBooking: maxAdvanceBooking || 360,
        minAdvanceHours: minAdvanceHours || 2,
        bookingBuffer: bookingBuffer || 15
      }
    });

    // Note: Availability templates are handled separately via /api/availability/templates

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[settings] Error:", err);
    return NextResponse.json({ ok: false, error: err.message || "Failed to save settings" }, { status: 500 });
  }
}

// Add PUT method for consistency
export async function PUT(req: Request) {
  return POST(req);
}