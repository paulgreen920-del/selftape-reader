import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session");

    if (!sessionCookie) {
      return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
    }

    const session = JSON.parse(sessionCookie.value);

    // Fetch full user data from database to include all settings
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        name: true,
        displayName: true,
        role: true,
        timezone: true,
        maxAdvanceBooking: true,
        minAdvanceHours: true,
        bookingBuffer: true,
        ratePer15Min: true,
        ratePer30Min: true,
        ratePer60Min: true,
        isActive: true,
        subscriptionStatus: true,
        headshotUrl: true,
        onboardingStep: true,
        emailVerified: true,
        emailVerifiedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      user,
    });
  } catch (err: any) {
    console.error("[/api/auth/me] Error:", err);
    return NextResponse.json({ ok: false, error: "Failed to get user" }, { status: 500 });
  }
}

export { GET };