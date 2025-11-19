import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * POST /api/onboarding/skip-step
 * Body: { step: string }
 * Marks the given onboarding step as skipped for the current user.
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
    }
    const userId = session.user.id;
    const { step } = await req.json();
    if (!step) {
      return NextResponse.json({ ok: false, error: "Missing step" }, { status: 400 });
    }
    // Add the skipped step to the user's skippedOnboardingSteps array
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        skippedOnboardingSteps: {
          push: step,
        },
      },
      select: { id: true, skippedOnboardingSteps: true },
    });
    return NextResponse.json({ ok: true, skipped: user.skippedOnboardingSteps }, { status: 200 });
  } catch (err: any) {
    console.error("[POST /api/onboarding/skip-step] error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Server error" }, { status: 500 });
  }
}
