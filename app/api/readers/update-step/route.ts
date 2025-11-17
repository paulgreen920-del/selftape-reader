import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

/**
 * POST /api/readers/update-step
 * Updates the onboarding step for a user
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { readerId, step } = body;

    if (!readerId) {
      return NextResponse.json({ ok: false, error: "Missing readerId" }, { status: 400 });
    }

    if (!step) {
      return NextResponse.json({ ok: false, error: "Missing step" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: readerId },
      data: { 
        onboardingStep: step,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: any) {
    console.error("[POST /api/readers/update-step] error:", err);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
