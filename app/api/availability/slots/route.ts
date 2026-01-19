import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: currentUser.id },
    });

      if (!user || (user.role !== 'READER' && !user.isAdmin)) {
      return NextResponse.json(
        { error: "Not authorized" },
        { status: 403 }
      );
    }

    // Get availability slots (limit to avoid overwhelming the response)
    const slots = await prisma.availabilitySlot.findMany({
      where: { 
        userId: user.id,
        startTime: { gte: new Date() } // Only future slots
      },
      orderBy: { startTime: 'asc' },
      take: 100 // Reasonable limit
    });

    return NextResponse.json({ 
      ok: true, 
      slots,
      count: slots.length
    });

  } catch (error) {
    console.error('[GET /api/availability/slots] error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
