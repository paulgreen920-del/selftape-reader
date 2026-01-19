import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function GET() {
  try {
    // Use NextAuth session instead of cookie
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
    }

    // Fetch full user data from database to include all settings
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
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
        stripeAccountId: true,
        stripeCustomerId: true,
        isAdmin: true,
        // Reader profile fields for onboarding pre-fill
        phone: true,
        city: true,
        bio: true,
        playableAgeMin: true,
        playableAgeMax: true,
        gender: true,
        unions: true,
        languages: true,
        specialties: true,
        links: true,
        acceptsTerms: true,
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