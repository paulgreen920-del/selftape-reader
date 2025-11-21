import { NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * POST /api/onboarding/skip-step
 * Body: { step: string }
 * Marks the given onboarding step as skipped for the current user.
 */
export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    
    if (!sessionCookie) {
      return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
    }

    const session = JSON.parse(sessionCookie.value);
    const userId = session.userId;

    if (!userId) {
      return NextResponse.json({ ok: false, error: "Invalid session" }, { status: 401 });
    }

    const { step } = await req.json();
    
    if (!step) {
      return NextResponse.json({ ok: false, error: "Missing step" }, { status: 400 });
    }

    // Just return success - skipping is handled by allowing dashboard access
    // The checklist will show incomplete steps regardless
    console.log(`[skip-step] User ${userId} skipped step: ${step}`);
    
    return NextResponse.json({ ok: true, skipped: step }, { status: 200 });
  } catch (err: any) {
    console.error("[POST /api/onboarding/skip-step] error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Server error" }, { status: 500 });
  }
}
