import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json({ 
        ok: false, 
        error: "Not authenticated" 
      }, { status: 401 });
    }
    
    const userId = currentUser.id;

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
