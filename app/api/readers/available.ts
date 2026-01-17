
import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

/**
 * GET /api/readers/available
 * Returns all fully onboarded available readers (no id required)
 */
export async function GET() {
  try {
    // Find all users with role READER or ADMIN, and include all necessary relations
    const users = await prisma.user.findMany({
      where: { role: { in: ["READER", "ADMIN"] } },
      include: {
        CalendarConnection: true,
        AvailabilitySlot: true,
      },
    });

    // Inline onboarding logic as per requirements
    const fullyOnboarded = users.filter(user => {
      return (
        user.emailVerified === true &&
        (user.role === "READER" || user.isAdmin === true) &&
        user.displayName != null &&
        user.headshotUrl != null &&
        user.ratePer15Min != null &&
        user.ratePer30Min != null &&
        user.ratePer60Min != null &&
        user.subscriptionId != null &&
        user.subscriptionStatus === "active" &&
        user.stripeAccountId != null &&
        user.stripeCustomerId != null &&
        user.isActive === true &&
        user.AvailabilitySlot && user.AvailabilitySlot.length > 0 &&
        user.CalendarConnection != null
      );
    });

    // Remove relations from output if not needed
    const output = fullyOnboarded.map(({ CalendarConnection, AvailabilitySlot, ...rest }) => ({
      ...rest,
      calendarConnection: CalendarConnection,
      availabilitySlotCount: AvailabilitySlot.length,
    }));

    return NextResponse.json({ ok: true, readers: output }, { status: 200 });
  } catch (err: any) {
    console.error("[GET /api/readers/available] error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Server error" }, { status: 500 });
  }
}
