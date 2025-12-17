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

    if (session.role !== 'READER' && session.role !== 'ADMIN') {
      return NextResponse.json({ ok: false, error: "Not a reader" }, { status: 403 });
    }

    // Update user to active
    await prisma.user.update({
      where: { id: session.userId },
      data: { isActive: true },
    });

    return NextResponse.json({ ok: true, message: "Profile activated!" });
  } catch (err: any) {
    console.error("[reader/activate] Error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
