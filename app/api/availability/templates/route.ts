import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
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

    const templates = await prisma.availabilityTemplate.findMany({
      where: { userId: user.id }
    });

    // AUTO-SYNC: Ensure templates and slots are synchronized
    console.log(`🚀 [GET] Checking template-slot sync for user ${user.id}`);
    const slotCount = await prisma.availabilitySlot.count({
      where: { userId: user.id }
    });
    
    console.log(`🚀 [GET] Found ${templates.length} templates and ${slotCount} slots for user ${user.id}`);
    
    // Force sync if user has templates but no slots (indicates desync)
    const needsSync = templates.length > 0 && slotCount === 0;
    
    if (needsSync) {
      console.log(`🔥🔥🔥 [GET-AUTO-SYNC] TRIGGERING SYNC: ${templates.length} templates but ${slotCount} slots 🔥🔥🔥`);
      try {
        await regenerateAvailabilitySlots(user.id);
        console.log(`✅ [GET] Successfully synced templates to slots for user ${user.id}`);
      } catch (error) {
        console.error(`❌ [GET] Failed to sync templates for user ${user.id}:`, error);
      }
    } else {
      console.log(`✅ [GET] Sync check: ${templates.length} templates, ${slotCount} slots - OK`);
    }

    // Sort templates to show Monday-Sunday order (1,2,3,4,5,6,0) with earliest start times
    const sortedTemplates = templates.sort((a: any, b: any) => {
      const dayOrderA = a.dayOfWeek === 0 ? 7 : a.dayOfWeek; // Sunday (0) becomes 7 for sorting
      const dayOrderB = b.dayOfWeek === 0 ? 7 : b.dayOfWeek; // Sunday (0) becomes 7 for sorting
      
      if (dayOrderA !== dayOrderB) {
        return dayOrderA - dayOrderB;
      }
      
      // If same day, sort by start time
      return a.startTime.localeCompare(b.startTime);
    });

    return NextResponse.json({ ok: true, templates: sortedTemplates });
  } catch (error: any) {
    console.error("[GET /api/availability/templates] Error:", error);
    return NextResponse.json({ 
      ok: false, 
      error: error.message || "Failed to fetch availability templates" 
    }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { templates } = body;

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

    // Delete existing templates
    await prisma.availabilityTemplate.deleteMany({
      where: { userId: user.id }
    });

    // Create new templates
    if (templates && templates.length > 0) {
      await prisma.availabilityTemplate.createMany({
        data: templates.map((template: any) => ({
          userId: user.id,
          dayOfWeek: template.dayOfWeek,
          startTime: template.startTime,
          endTime: template.endTime,
          isActive: true
        }))
      });
    }

    // Regenerate availability slots from the new templates
    await regenerateAvailabilitySlots(user.id);

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("[POST /api/availability/templates] Error:", error);
    return NextResponse.json({ 
      ok: false, 
      error: error.message || "Failed to create availability template" 
    }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { templates } = body;

    if (!Array.isArray(templates)) {
      return NextResponse.json({ 
        ok: false, 
        error: "Templates must be an array" 
      }, { status: 400 });
    }

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

    // Delete existing templates for this user
    await prisma.availabilityTemplate.deleteMany({
      where: { userId: user.id }
    });

    // Create new templates
    if (templates.length > 0) {
      const createData = templates.map(template => ({
        userId: user.id,
        dayOfWeek: template.dayOfWeek,
        startTime: template.startTime,
        endTime: template.endTime,
        isActive: true
      }));

      await prisma.availabilityTemplate.createMany({
        data: createData.map((item: any, index: number) => ({
          ...item,
          id: `template_${Date.now()}_${index}`,
          updatedAt: new Date(),
        }))
      });
    }

    // Regenerate availability slots from the new templates
    console.log(`[PUT] About to regenerate slots for user ${user.id}`);
    try {
      await regenerateAvailabilitySlots(user.id);
      console.log(`[PUT] Successfully regenerated slots for user ${user.id}`);
    } catch (regenerationError) {
      console.error(`[PUT] Failed to regenerate slots for user ${user.id}:`, regenerationError);
      // Don't fail the template save, just log the error
    }

    return NextResponse.json({ ok: true, message: "Templates updated successfully" });
  } catch (error: any) {
    console.error("[PUT /api/availability/templates] Error:", error);
    return NextResponse.json({ 
      ok: false, 
      error: error.message || "Failed to update availability templates" 
    }, { status: 500 });
  }
}

// Helper function to regenerate availability slots from templates
async function regenerateAvailabilitySlots(userId: string) {
  console.log(`🔥🔥🔥 [REGEN] FUNCTION CALLED FOR USER ${userId} 🔥🔥🔥`);
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
