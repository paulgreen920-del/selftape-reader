import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session");

    if (!sessionCookie) {
      return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
    }

    const session = JSON.parse(sessionCookie.value);

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
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
      where: { id: session.userId },
      data: { 
        role: 'READER',
        isActive: true,
        onboardingStep: null, // Clear onboarding step - they're done
      },
    });

    // Update session cookie with new role
    const newSession = { ...session, role: 'READER' };
    const response = NextResponse.json({ ok: true, message: "Profile activated!" });
    response.cookies.set("session", JSON.stringify(newSession), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (err: any) {
    console.error("[reader/activate] Error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
