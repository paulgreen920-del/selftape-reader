import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/readers/available
 * Returns all fully onboarded available readers who have bookable time slots
 */
export async function GET() {
  try {
    const now = new Date();
    
    // Find all users with role READER or ADMIN, and include all necessary relations
    const users = await prisma.user.findMany({
      where: { role: { in: ["READER", "ADMIN"] } },
      include: {
        CalendarConnection: true,
        AvailabilitySlot: {
          where: {
            isBooked: false,
            startTime: { gt: now }
          }
        },
      },
    });

    // Inline onboarding logic as per requirements
    // Now also checks for FUTURE AVAILABLE slots, not just any slots
    const fullyOnboarded = users.filter((user: any) => {
      // Count only future, unbooked slots
      const futureAvailableSlots = user.AvailabilitySlot?.length || 0;
      
      return (
        user.emailVerified === true &&
        (user.role === "READER" || user.role === "ADMIN") &&
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
        futureAvailableSlots > 0 && // Must have at least one future available slot
        user.CalendarConnection != null
      );
    });

    // Remove relations from output if not needed
    const output = fullyOnboarded.map(({
      CalendarConnection,
      AvailabilitySlot,
      ...rest
    }: {
      CalendarConnection: any;
      AvailabilitySlot: any[];
      [key: string]: any;
    }) => ({
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