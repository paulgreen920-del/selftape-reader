import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: currentUser.id },
    });

    if (!user) {
      return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
    }

    // Check they've completed onboarding (have profile data)
    if (!user.onboardingStep) {
      return NextResponse.json({ ok: false, error: "Please complete onboarding first" }, { status: 400 });
    }

    // Activate as reader - set role to READER and isActive to true
    await prisma.user.update({
      where: { id: currentUser.id },
      data: { 
        role: 'READER',
        isActive: true,
        onboardingStep: null, // Clear onboarding step - they're done
      },
    });

    return NextResponse.json({ ok: true, message: "Profile activated!" });

    return response;
  } catch (err: any) {
    console.error("[reader/activate] Error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
