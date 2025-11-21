import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    // Get user from session
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session");

    if (!sessionCookie?.value) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const sessionData = JSON.parse(sessionCookie.value);
    const user = await prisma.user.findUnique({
      where: { id: sessionData.userId },
    });

    if (!user || (user.role !== 'READER' && user.role !== 'ADMIN')) {
      return NextResponse.json(
        { error: "Not authorized" },
        { status: 403 }
      );
    }

    console.log(`[SYNC] Force syncing templates to slots for user ${user.id}`);

    // Get current templates and slots
    const templates = await prisma.availabilityTemplate.findMany({
      where: { userId: user.id, isActive: true }
    });

    const currentSlots = await prisma.availabilitySlot.count({
      where: { userId: user.id }
    });

    console.log(`[SYNC] Current state: ${templates.length} templates, ${currentSlots} slots`);

    // Force regeneration
    await regenerateAvailabilitySlots(user.id);

    const newSlots = await prisma.availabilitySlot.count({
      where: { userId: user.id }
    });

    console.log(`[SYNC] Sync complete: ${currentSlots} → ${newSlots} slots`);

    return NextResponse.json({ 
      ok: true, 
      message: "Templates synced to calendar successfully",
      beforeSlots: currentSlots,
      afterSlots: newSlots,
      templates: templates.length
    });

  } catch (error: any) {
    console.error("[POST /api/availability/sync] Error:", error);
    return NextResponse.json({ 
      ok: false, 
      error: error.message || "Failed to sync availability" 
    }, { status: 500 });
  }
}

// Copy of regeneration function
async function regenerateAvailabilitySlots(userId: string) {
  console.log(`🔥🔥🔥 [SYNC-REGEN] FUNCTION CALLED FOR USER ${userId} 🔥🔥🔥`);
  console.log(`[regenerateAvailabilitySlots] Starting regeneration for user ${userId}`);
  try {
    // Delete existing slots for this user
    console.log(`[regenerateAvailabilitySlots] Deleting existing slots for user ${userId}`);
    const deleteResult = await prisma.availabilitySlot.deleteMany({
      where: { userId }
    });
    console.log(`[regenerateAvailabilitySlots] Deleted ${deleteResult.count} existing slots for user ${userId}`);

    // Get the user's templates
    const templates = await prisma.availabilityTemplate.findMany({
      where: { userId, isActive: true }
    });

    if (templates.length === 0) {
      console.log(`[regenerateAvailabilitySlots] No templates found for user ${userId}`);
      return;
    }

    console.log(`[regenerateAvailabilitySlots] Found ${templates.length} templates for user ${userId}`);

    // Generate slots for the next 30 days
    const now = new Date();
    const slotsToCreate: any[] = [];

    for (let daysAhead = 0; daysAhead < 30; daysAhead++) {
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() + daysAhead);
      
      templates.forEach((template: any) => {
        if (targetDate.getDay() === template.dayOfWeek) {
          // Parse time strings (e.g., "09:00" and "17:00")
          const [startHour, startMin] = template.startTime.split(':').map(Number);
          const [endHour, endMin] = template.endTime.split(':').map(Number);
          
          // Create 30-minute slots between start and end time
          const startMinutes = startHour * 60 + startMin;
          const endMinutes = endHour * 60 + endMin;
          
          for (let currentMin = startMinutes; currentMin < endMinutes; currentMin += 30) {
            const slotStartTime = new Date(targetDate);
            slotStartTime.setHours(Math.floor(currentMin / 60), currentMin % 60, 0, 0);
            
            const slotEndTime = new Date(targetDate);
            slotEndTime.setHours(Math.floor((currentMin + 30) / 60), (currentMin + 30) % 60, 0, 0);
            
            slotsToCreate.push({
              userId,
              startTime: slotStartTime,
              endTime: slotEndTime,
              isBooked: false,
            });
          }
        }
      });
    }

    // Create new slots
    if (slotsToCreate.length > 0) {
      await prisma.availabilitySlot.createMany({
        data: slotsToCreate,
      });
      console.log(`[regenerateAvailabilitySlots] Generated ${slotsToCreate.length} slots for user ${userId}`);
    } else {
      console.log(`[regenerateAvailabilitySlots] No slots to create for user ${userId}`);
    }

  } catch (error) {
    console.error(`[regenerateAvailabilitySlots] Error for user ${userId}:`, error);
    throw error;
  }
}
