// app/api/availability/sync/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { randomUUID } from 'crypto';

// Convert local time to UTC
function localTimeToUTC(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timezone: string
): Date {
  const noonUTC = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });

  const parts = formatter.formatToParts(noonUTC);
  const getPart = (type: string) => {
    const part = parts.find((p) => p.type === type);
    return part ? parseInt(part.value) : 0;
  };

  const tzHour = getPart("hour");
  const offsetHours = tzHour - 12;
  const offsetMinutes = offsetHours * 60;

  const localAsUTC = new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0));
  localAsUTC.setUTCMinutes(localAsUTC.getUTCMinutes() - offsetMinutes);

  return localAsUTC;
}

// Regenerate availability slots from templates
async function regenerateAvailabilitySlots(userId: string): Promise<number> {
  console.log(`[SYNC-REGEN] Starting for user ${userId}`);
  
  try {
    // Get user's timezone
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { timezone: true }
    });
    const userTimezone = user?.timezone || "America/New_York";
    console.log(`[SYNC-REGEN] Using timezone: ${userTimezone}`);

    // Delete existing unbooked slots
    const deleteResult = await prisma.availabilitySlot.deleteMany({
      where: { 
        userId,
        isBooked: false
      }
    });
    console.log(`[SYNC-REGEN] Deleted ${deleteResult.count} existing slots`);
    
    // Get active templates
    const templates = await prisma.availabilityTemplate.findMany({
      where: { 
        userId,
        isActive: true 
      }
    });
    console.log(`[SYNC-REGEN] Found ${templates.length} templates`);
    
    if (templates.length === 0) {
      return 0;
    }
    
    // Generate slots for next 30 days
    const slotsToCreate: any[] = [];
    const now = new Date();

    // Get current date in user's timezone
    const dateFormatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: userTimezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    
    for (let daysAhead = 0; daysAhead < 30; daysAhead++) {
      const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
      const dateStr = dateFormatter.format(futureDate);
      const [year, month, day] = dateStr.split("-").map(Number);

      // Get day of week in user's timezone
      const targetDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
      const dayFormatter = new Intl.DateTimeFormat("en-US", {
        timeZone: userTimezone,
        weekday: "short",
      });
      const dayName = dayFormatter.format(targetDate);
      const dayOfWeekMap: { [key: string]: number } = {
        Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
      };
      const dayOfWeek = dayOfWeekMap[dayName];
      
      // Find templates for this day
      const dayTemplates = templates.filter(t => t.dayOfWeek === dayOfWeek);
      
      for (const template of dayTemplates) {
        const [startHour, startMin] = template.startTime.split(':').map(Number);
        const [endHour, endMin] = template.endTime.split(':').map(Number);
        
        let currentHour = startHour;
        let currentMin = startMin;
        
        while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
          // Convert local time to UTC
          const slotStartUTC = localTimeToUTC(year, month, day, currentHour, currentMin, userTimezone);
          
          let slotEndHour = currentHour;
          let slotEndMin = currentMin + 30;
          if (slotEndMin >= 60) {
            slotEndHour += 1;
            slotEndMin -= 60;
          }
          
          if (slotEndHour < endHour || (slotEndHour === endHour && slotEndMin <= endMin)) {
            const slotEndUTC = localTimeToUTC(year, month, day, slotEndHour, slotEndMin, userTimezone);
            
            slotsToCreate.push({
              id: randomUUID(),
              userId,
              startTime: slotStartUTC,
              endTime: slotEndUTC,
              isBooked: false,
              updatedAt: new Date(),
            });
          }
          
          currentMin += 30;
          if (currentMin >= 60) {
            currentHour += 1;
            currentMin -= 60;
          }
        }
      }
    }
    
    console.log(`[SYNC-REGEN] Creating ${slotsToCreate.length} slots`);
    
    if (slotsToCreate.length > 0) {
      await prisma.availabilitySlot.createMany({
        data: slotsToCreate,
        skipDuplicates: true,
      });
      
      // Log sample for verification
      const sample = slotsToCreate[0];
      console.log(`[SYNC-REGEN] Sample slot: ${sample.startTime.toISOString()}`);
    }
    
    return slotsToCreate.length;
    
  } catch (error) {
    console.error(`[SYNC-REGEN] Error:`, error);
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
    
    const [templateCount, slotCount] = await Promise.all([
      prisma.availabilityTemplate.count({ where: { userId, isActive: true } }),
      prisma.availabilitySlot.count({ where: { userId } })
    ]);
    
    console.log(`[SYNC] User ${userId}: ${templateCount} templates, ${slotCount} slots`);
    
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