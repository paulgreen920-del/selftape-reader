import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session");

    if (!sessionCookie) {
      return NextResponse.json({ ok: false, error: "No session" }, { status: 401 });
    }

    const session = JSON.parse(sessionCookie.value);

    // Get fresh user data from database
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, email: true, name: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
    }

    // Update session with fresh data
    const updatedSession = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    const response = NextResponse.json({ ok: true });

    response.cookies.set("session", JSON.stringify(updatedSession), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (err: any) {
    console.error("[refresh-session] Error:", err);
    return NextResponse.json({ ok: false, error: "Failed to refresh" }, { status: 500 });
  }
}