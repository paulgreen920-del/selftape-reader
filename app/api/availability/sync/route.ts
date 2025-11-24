// app/api/availability/sync/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { randomUUID } from 'crypto';

// Regenerate availability slots from templates
async function regenerateAvailabilitySlots(userId: string): Promise<number> {
  console.log(`🔥🔥🔥 [SYNC-REGEN] FUNCTION CALLED FOR USER ${userId} 🔥🔥🔥`);
  
  try {
    console.log(`[regenerateAvailabilitySlots] Starting regeneration for user ${userId}`);
    
    // Delete existing slots (only non-booked ones to preserve bookings)
    console.log(`[regenerateAvailabilitySlots] Deleting existing slots for user ${userId}`);
    const deleteResult = await prisma.availabilitySlot.deleteMany({
      where: { 
        userId,
        isBooked: false  // Only delete unbooked slots
      }
    });
    console.log(`[regenerateAvailabilitySlots] Deleted ${deleteResult.count} existing slots for user ${userId}`);
    
    // Get active templates
    const templates = await prisma.availabilityTemplate.findMany({
      where: { 
        userId,
        isActive: true 
      }
    });
    console.log(`[regenerateAvailabilitySlots] Found ${templates.length} templates for user ${userId}`);
    
    if (templates.length === 0) {
      console.log(`[regenerateAvailabilitySlots] No active templates found for user ${userId}`);
      return 0;
    }
    
    // Generate slots for next 30 days
    const slotsToCreate: {
      id: string;
      userId: string;
      startTime: Date;
      endTime: Date;
      isBooked: boolean;
      updatedAt: Date;
    }[] = [];
    
    const now = new Date();
    
    for (let daysAhead = 0; daysAhead < 30; daysAhead++) {
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() + daysAhead);
      const dayOfWeek = targetDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
      
      // Find templates for this day
      const dayTemplates = templates.filter(t => t.dayOfWeek === dayOfWeek);
      
      for (const template of dayTemplates) {
        // Parse start and end times (format: "HH:MM")
        const [startHour, startMin] = template.startTime.split(':').map(Number);
        const [endHour, endMin] = template.endTime.split(':').map(Number);
        
        // Create 30-minute slots
        let currentHour = startHour;
        let currentMin = startMin;
        
        while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
          const slotStart = new Date(targetDate);
          slotStart.setHours(currentHour, currentMin, 0, 0);
          
          // Calculate end time (30 minutes later)
          let slotEndHour = currentHour;
          let slotEndMin = currentMin + 30;
          if (slotEndMin >= 60) {
            slotEndHour += 1;
            slotEndMin -= 60;
          }
          
          const slotEnd = new Date(targetDate);
          slotEnd.setHours(slotEndHour, slotEndMin, 0, 0);
          
          // Only add if end time doesn't exceed template end time
          if (slotEndHour < endHour || (slotEndHour === endHour && slotEndMin <= endMin)) {
            slotsToCreate.push({
              id: randomUUID(),
              userId,
              startTime: slotStart,
              endTime: slotEnd,
              isBooked: false,
              updatedAt: new Date(),
            });
          }
          
          // Move to next slot
          currentMin += 30;
          if (currentMin >= 60) {
            currentHour += 1;
            currentMin -= 60;
          }
        }
      }
    }
    
    console.log(`[regenerateAvailabilitySlots] Creating ${slotsToCreate.length} slots for user ${userId}`);
    
    if (slotsToCreate.length > 0) {
      await prisma.availabilitySlot.createMany({
        data: slotsToCreate,
        skipDuplicates: true,
      });
    }
    
    console.log(`[regenerateAvailabilitySlots] Successfully created ${slotsToCreate.length} slots for user ${userId}`);
    return slotsToCreate.length;
    
  } catch (error) {
    console.error(`[regenerateAvailabilitySlots] Error for user ${userId}:`, error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = session.user.id;
    
    // Get current state for logging
    const [templateCount, slotCount] = await Promise.all([
      prisma.availabilityTemplate.count({ where: { userId, isActive: true } }),
      prisma.availabilitySlot.count({ where: { userId } })
    ]);
    
    console.log(`[SYNC] Force syncing templates to slots for user ${userId}`);
    console.log(`[SYNC] Current state: ${templateCount} templates, ${slotCount} slots`);
    
    // Regenerate slots
    const newSlotCount = await regenerateAvailabilitySlots(userId);
    
    return NextResponse.json({
      ok: true,
      message: 'Availability synced successfully',
      templatesFound: templateCount,
      slotsCreated: newSlotCount,
    });
    
  } catch (error) {
    console.error('[POST /api/availability/sync] Error:', error);
    return NextResponse.json(
      { error: 'Failed to sync availability' },
      { status: 500 }
    );
  }
}