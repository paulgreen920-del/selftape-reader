import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ 
        ok: false,
        connected: false,
        error: "Missing userId parameter" 
      }, { status: 400 });
    }

    const connection = await prisma.calendarConnection.findFirst({
      where: { userId },
      select: {
        id: true,
        provider: true,
        email: true,
        createdAt: true
      }
    });

    return NextResponse.json({ 
      ok: true, 
      connected: !!connection,
      provider: connection?.provider || null,
      email: connection?.email || null,
      connection 
    });
  } catch (error: any) {
    console.error("[GET /api/calendar/connection] Error:", error);
    return NextResponse.json({ 
      ok: false,
      connected: false,
      error: error.message || "Failed to fetch calendar connection" 
    }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { provider, email, accessToken, refreshToken } = body;

    if (!provider || !email || !accessToken) {
      return NextResponse.json({ 
        ok: false, 
        error: "Missing required fields" 
      }, { status: 400 });
    }

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

    // Delete existing connection for this user
    await prisma.calendarConnection.deleteMany({
      where: { userId }
    });

    // Create new connection
    const connection = await prisma.calendarConnection.create({
      data: {
        id: `cal_${Date.now()}_${userId}`,
        userId,
        provider,
        email,
        accessToken,
        refreshToken,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true, connection });
  } catch (error: any) {
    console.error("[POST /api/calendar/connection] Error:", error);
    return NextResponse.json({ 
      ok: false, 
      error: error.message || "Failed to create calendar connection" 
    }, { status: 500 });
  }
}
