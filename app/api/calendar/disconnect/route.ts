import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    // Get userId from session
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session");
    
    if (!sessionCookie) {
      return NextResponse.json({ 
        ok: false, 
        error: "Not authenticated" 
      }, { status: 401 });
    }
    
    const session = JSON.parse(sessionCookie.value);
    const userId = session.userId;

    // Delete calendar connection for this user
    await prisma.calendarConnection.deleteMany({
      where: { userId }
    });

    return NextResponse.json({ 
      ok: true, 
      message: "Calendar disconnected successfully" 
    });
  } catch (error: any) {
    console.error("[POST /api/calendar/disconnect] Error:", error);
    return NextResponse.json({ 
      ok: false, 
      error: error.message || "Failed to disconnect calendar" 
    }, { status: 500 });
  }
}
