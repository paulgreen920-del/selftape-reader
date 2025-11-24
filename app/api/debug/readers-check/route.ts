// app/api/debug/readers-check/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      where: { role: { in: ["READER", "ADMIN"] } },
      include: {
        CalendarConnection: true,
        AvailabilitySlot: {
          take: 5, // Just get a sample
        },
      },
    });

    const debugInfo = users.map((user: any) => ({
      id: user.id,
      name: user.displayName,
      email: user.email,
      checks: {
        emailVerified: user.emailVerified === true,
        hasDisplayName: user.displayName != null,
        hasHeadshotUrl: user.headshotUrl != null,
        hasRatePer15Min: user.ratePer15Min != null,
        hasRatePer30Min: user.ratePer30Min != null,
        hasRatePer60Min: user.ratePer60Min != null,
        hasSubscriptionId: user.subscriptionId != null,
        subscriptionStatusActive: user.subscriptionStatus === "active",
        hasStripeAccountId: user.stripeAccountId != null,
        hasStripeCustomerId: user.stripeCustomerId != null,
        isActive: user.isActive === true,
        hasAvailabilitySlots: user.AvailabilitySlot && user.AvailabilitySlot.length > 0,
        hasCalendarConnection: user.CalendarConnection != null,
      },
      rawValues: {
        emailVerified: user.emailVerified,
        subscriptionStatus: user.subscriptionStatus,
        subscriptionId: user.subscriptionId,
        stripeAccountId: user.stripeAccountId,
        stripeCustomerId: user.stripeCustomerId,
        isActive: user.isActive,
        availabilitySlotCount: user.AvailabilitySlot?.length || 0,
        calendarProvider: user.CalendarConnection?.provider || null,
      },
      passesAllChecks: (
        user.emailVerified === true &&
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
      ),
    }));

    return NextResponse.json({ 
      ok: true, 
      totalReaders: users.length,
      passingReaders: debugInfo.filter((d: any) => d.passesAllChecks).length,
      readers: debugInfo 
    }, { status: 200 });
  } catch (err: any) {
    console.error("[DEBUG] error:", err);
    return NextResponse.json({ ok: false, error: err?.message }, { status: 500 });
  }
}
