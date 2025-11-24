import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

// Helper function to convert a time in a specific timezone to UTC
function localTimeToUTC(year: number, month: number, day: number, hour: number, minute: number, timezone: string): Date {
  // Create an ISO string for the local time
  const localDateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
  
  // Use Intl.DateTimeFormat to get the UTC offset for this timezone at this date/time
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  
  // Create date assuming it's UTC first
  const utcDate = new Date(localDateStr + 'Z');
  
  // Get what this UTC time would be in the target timezone
  const parts = formatter.formatToParts(utcDate);
  const getPart = (type: string) => parts.find(p => p.type === type)?.value || '0';
  
  const tzYear = parseInt(getPart('year'));
  const tzMonth = parseInt(getPart('month'));
  const tzDay = parseInt(getPart('day'));
  const tzHour = parseInt(getPart('hour'));
  const tzMinute = parseInt(getPart('minute'));
  
  // Calculate the offset in minutes
  const utcMinutes = utcDate.getUTCHours() * 60 + utcDate.getUTCMinutes();
  const tzMinutes = tzHour * 60 + tzMinute;
  
  // Handle day boundary differences
  let offsetMinutes = tzMinutes - utcMinutes;
  if (tzDay > utcDate.getUTCDate() || (tzMonth > utcDate.getUTCMonth() + 1)) {
    offsetMinutes += 24 * 60;
  } else if (tzDay < utcDate.getUTCDate() || (tzMonth < utcDate.getUTCMonth() + 1)) {
    offsetMinutes -= 24 * 60;
  }
  
  // Now create the actual date: we want localDateStr to BE the local time,
  // so we need to subtract the offset to get UTC
  const targetDate = new Date(localDateStr + 'Z');
  targetDate.setUTCMinutes(targetDate.getUTCMinutes() - offsetMinutes);
  
  return targetDate;
}

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
        await regenerateAvailabilitySlots(user.id, user.timezone || 'America/New_York');
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
    await regenerateAvailabilitySlots(user.id, user.timezone || 'America/New_York');

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
    console.log(`[PUT] About to regenerate slots for user ${user.id} in timezone ${user.timezone || 'America/New_York'}`);
    try {
      await regenerateAvailabilitySlots(user.id, user.timezone || 'America/New_York');
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
// Now accepts readerTimezone parameter to properly convert times to UTC
async function regenerateAvailabilitySlots(userId: string, readerTimezone: string) {
  console.log(`🔥🔥🔥 [REGEN] FUNCTION CALLED FOR USER ${userId} with timezone ${readerTimezone} 🔥🔥🔥`);
  console.log(`[regenerateAvailabilitySlots] Starting regeneration for user ${userId}`);
  try {
    // Delete existing NON-BOOKED slots for this user (preserve booked slots)
    console.log(`[regenerateAvailabilitySlots] Deleting existing non-booked slots for user ${userId}`);
    const deleteResult = await prisma.availabilitySlot.deleteMany({
      where: { 
        userId,
        isBooked: false 
      }
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

    // Get existing booked slots to avoid creating duplicates for those times
    const existingBookedSlots = await prisma.availabilitySlot.findMany({
      where: { userId, isBooked: true },
      select: { startTime: true }
    });
    const bookedSlotTimes = new Set(
      existingBookedSlots.map(slot => slot.startTime.getTime())
    );

    // Generate slots for the next 30 days
    // Use a Map to deduplicate slots by their start time (key = timestamp)
    const slotMap = new Map<number, any>();
    
    // Get current time in reader's timezone to start from today
    const now = new Date();

    for (let daysAhead = 0; daysAhead < 30; daysAhead++) {
      // Calculate the target date in reader's timezone
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() + daysAhead);
      
      // Get year, month, day in reader's timezone
      const formatter = new Intl.DateTimeFormat('en-CA', { // en-CA gives YYYY-MM-DD format
        timeZone: readerTimezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      const dateStr = formatter.format(targetDate);
      const [year, month, day] = dateStr.split('-').map(Number);
      
      // Get day of week in reader's timezone
      const dowFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: readerTimezone,
        weekday: 'short',
      });
      const dowStr = dowFormatter.format(targetDate);
      const dayOfWeekMap: Record<string, number> = {
        'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6
      };
      const targetDayOfWeek = dayOfWeekMap[dowStr];
      
      templates.forEach((template: any) => {
        if (targetDayOfWeek === template.dayOfWeek) {
          // Parse time strings (e.g., "09:00" and "17:00") - these are in READER's timezone
          const [startHour, startMin] = template.startTime.split(':').map(Number);
          const [endHour, endMin] = template.endTime.split(':').map(Number);
          
          // Create 30-minute slots between start and end time
          const startMinutes = startHour * 60 + startMin;
          const endMinutes = endHour * 60 + endMin;
          
          for (let currentMin = startMinutes; currentMin < endMinutes; currentMin += 30) {
            const slotHour = Math.floor(currentMin / 60);
            const slotMinute = currentMin % 60;
            
            // Convert reader's local time to UTC
            const slotStartTimeUTC = localTimeToUTC(year, month, day, slotHour, slotMinute, readerTimezone);
            const slotEndTimeUTC = new Date(slotStartTimeUTC.getTime() + 30 * 60 * 1000);
            
            // Use start time timestamp as key to deduplicate
            const slotKey = slotStartTimeUTC.getTime();
            
            // Skip if this slot time is already booked
            if (bookedSlotTimes.has(slotKey)) {
              continue;
            }
            
            // Only add if we haven't already added a slot for this time
            if (!slotMap.has(slotKey)) {
              slotMap.set(slotKey, {
                id: randomUUID(),
                userId,
                startTime: slotStartTimeUTC,
                endTime: slotEndTimeUTC,
                isBooked: false,
                updatedAt: new Date(),
              });
            }
          }
        }
      });
    }

    // Convert map values to array for createMany
    const slotsToCreate = Array.from(slotMap.values());

    // Create new slots
    if (slotsToCreate.length > 0) {
      await prisma.availabilitySlot.createMany({
        data: slotsToCreate,
      });
      console.log(`[regenerateAvailabilitySlots] Generated ${slotsToCreate.length} unique slots for user ${userId}`);
      
      // Log a sample slot for debugging
      if (slotsToCreate.length > 0) {
        const sample = slotsToCreate[0];
        console.log(`[regenerateAvailabilitySlots] Sample slot: ${sample.startTime.toISOString()} UTC`);
        console.log(`[regenerateAvailabilitySlots] In reader timezone (${readerTimezone}): ${sample.startTime.toLocaleString('en-US', { timeZone: readerTimezone })}`);
      }
    } else {
      console.log(`[regenerateAvailabilitySlots] No slots to create for user ${userId}`);
    }

  } catch (error) {
    console.error(`[regenerateAvailabilitySlots] Error for user ${userId}:`, error);
    throw error;
  }
}