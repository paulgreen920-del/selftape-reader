import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";



export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { readerId, daysAhead = 15, regenerate = false } = body;

    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const reader = await prisma.user.findUnique({
      where: { id: currentUser.id, role: { in: ["READER", "ADMIN"] } },
      include: {
        AvailabilityTemplate: {
          where: { isActive: true }
        }
      }
    });

    if (!reader) {
      return NextResponse.json({ ok: false, error: "Reader not found" }, { status: 404 });
    }

    if (reader.AvailabilityTemplate.length === 0) {
      return NextResponse.json({ ok: false, error: "No availability templates found. Please set up your weekly schedule first." }, { status: 400 });
    }

    console.log(`[generate-availability] Generating ${daysAhead} days for ${reader.displayName || reader.name}`);

    let totalCreated = 0;
    let daysProcessed = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // If regenerate, delete existing future slots
    if (regenerate) {
      await prisma.availabilitySlot.deleteMany({
        where: {
          userId: reader.id,
          startTime: { gte: today }
        }
      });
    }

    function timeToMinutes(timeStr: string): number {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    }

    // Generate slots for each day
    for (let dayOffset = 0; dayOffset < daysAhead; dayOffset++) {
      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() + dayOffset);
      const dayOfWeek = targetDate.getDay();

      // Find templates for this day of week
      const dayTemplates = reader.AvailabilityTemplate.filter(
        (template: any) => template.dayOfWeek === dayOfWeek
      );

      if (dayTemplates.length === 0) continue;

      daysProcessed++;

      // Create slots for each template
      for (const template of dayTemplates) {
        const startMin = timeToMinutes(template.startTime);
        const endMin = timeToMinutes(template.endTime);
        
        // Create 30-minute slots within the template time range
        for (let slotMin = startMin; slotMin < endMin; slotMin += 30) {
          const slotEndMin = Math.min(slotMin + 30, endMin);
          
          const startTime = new Date(targetDate);
          startTime.setHours(Math.floor(slotMin / 60), slotMin % 60, 0, 0);
          
          const endTime = new Date(targetDate);
          endTime.setHours(Math.floor(slotEndMin / 60), slotEndMin % 60, 0, 0);

          // Check if slot already exists (if not regenerating)
          if (!regenerate) {
            const existingSlot = await prisma.availabilitySlot.findFirst({
              where: {
                userId: reader.id,
                startTime: startTime,
                endTime: endTime
              }
            });
            
            if (existingSlot) continue;
          }

          // Create the availability slot
          await prisma.availabilitySlot.create({
            data: {
              id: `slot_${Date.now()}_${reader.id}_${startTime.getTime()}`,
              userId: reader.id,
              startTime,
              endTime,
              isBooked: false,
              updatedAt: new Date(),
            }
          });

          totalCreated++;
        }
      }
    }

    console.log(`[generate-availability] Complete: ${daysProcessed} days, ${totalCreated} slots created`);

    return NextResponse.json({ 
      ok: true, 
      message: `Generated availability for ${daysProcessed} days`,
      daysProcessed,
      slotsCreated: totalCreated
    });

  } catch (error: any) {
    console.error("[generate-availability] Error:", error);
    return NextResponse.json({ 
      ok: false, 
      error: error.message || "Failed to generate availability" 
    }, { status: 500 });
  }
}
