import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

/**
 * Convert a local time in a specific timezone to a UTC Date object.
 * 
 * Example: localTimeToUTC(2025, 11, 25, 9, 0, "America/New_York")
 * Returns: Date object representing 9am EST as UTC (which is 14:00 UTC)
 */
function localTimeToUTC(
  year: number, 
  month: number, 
  day: number, 
  hour: number, 
  minute: number, 
  timezone: string
): Date {
  // Create a date string in ISO format
  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
  
  // Method: Use the fact that toLocaleString can format a UTC date into a timezone,
  // then we can calculate the offset by comparing
  
  // Create a reference point: Jan 1, 2000 00:00:00 UTC
  const referenceUTC = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  
  // Format this UTC time as if it were in the target timezone
  const inTargetTZ = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(referenceUTC);
  
  const tzParts: Record<string, number> = {};
  inTargetTZ.forEach(part => {
    if (part.type !== 'literal') {
      tzParts[part.type] = parseInt(part.value);
    }
  });
  
  // Calculate offset in minutes between UTC and target timezone at this point in time
  // If UTC shows 14:00 and timezone shows 09:00, offset is -5 hours (EST)
  const utcTotalMinutes = referenceUTC.getUTCHours() * 60 + referenceUTC.getUTCMinutes();
  const tzTotalMinutes = tzParts.hour * 60 + tzParts.minute;
  
  // Handle day wraparound
  let dayDiff = 0;
  if (tzParts.day > referenceUTC.getUTCDate()) {
    dayDiff = 1;
  } else if (tzParts.day < referenceUTC.getUTCDate()) {
    dayDiff = -1;
  }
  
  const offsetMinutes = (tzTotalMinutes + dayDiff * 24 * 60) - utcTotalMinutes;
  
  // Now: if we want "9:00 in timezone X" to be stored as UTC,
  // and the timezone is at offset -300 (EST = UTC-5),
  // then 9:00 EST = 9:00 + 5 hours = 14:00 UTC
  // So we SUBTRACT the offset (which is negative for EST, so subtracting -300 = adding 300)
  
  const resultUTC = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  resultUTC.setUTCMinutes(resultUTC.getUTCMinutes() - offsetMinutes);
  
  return resultUTC;
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

    if (!user || (user.role !== 'READER' && user.role !== 'ADMIN' && !user.onboardingStep)) {
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
      const dayOrderA = a.dayOfWeek === 0 ? 7 : a.dayOfWeek;
      const dayOrderB = b.dayOfWeek === 0 ? 7 : b.dayOfWeek;
      
      if (dayOrderA !== dayOrderB) {
        return dayOrderA - dayOrderB;
      }
      
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

    if (!user || (user.role !== 'READER' && user.role !== 'ADMIN' && !user.onboardingStep)) {
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

    if (!user || (user.role !== 'READER' && user.role !== 'ADMIN' && !user.onboardingStep)) {
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
    const readerTimezone = user.timezone || 'America/New_York';
    console.log(`[PUT] About to regenerate slots for user ${user.id} in timezone ${readerTimezone}`);
    
    try {
      await regenerateAvailabilitySlots(user.id, readerTimezone);
      console.log(`[PUT] Successfully regenerated slots for user ${user.id}`);
    } catch (regenerationError) {
      console.error(`[PUT] Failed to regenerate slots for user ${user.id}:`, regenerationError);
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

/**
 * Regenerate availability slots from templates.
 * Templates store times in reader's local timezone (e.g., "09:00" means 9am in reader's TZ).
 * Slots are stored as UTC in the database.
 */
async function regenerateAvailabilitySlots(userId: string, readerTimezone: string) {
  console.log(`🔥 [REGEN] Starting for user ${userId} with timezone ${readerTimezone}`);
  
  try {
    // Delete existing NON-BOOKED slots (preserve booked slots)
    const deleteResult = await prisma.availabilitySlot.deleteMany({
      where: { 
        userId,
        isBooked: false 
      }
    });
    console.log(`[REGEN] Deleted ${deleteResult.count} existing slots`);

    // Get the user's templates
    const templates = await prisma.availabilityTemplate.findMany({
      where: { userId, isActive: true }
    });

    if (templates.length === 0) {
      console.log(`[REGEN] No templates found for user ${userId}`);
      return;
    }

    console.log(`[REGEN] Found ${templates.length} templates`);

    // Get existing booked slots to avoid duplicates
    const existingBookedSlots = await prisma.availabilitySlot.findMany({
      where: { userId, isBooked: true },
      select: { startTime: true }
    });
    const bookedSlotTimes = new Set(
      existingBookedSlots.map(slot => slot.startTime.getTime())
    );

    // Use Map to deduplicate slots by their UTC start time
    const slotMap = new Map<number, any>();
    const now = new Date();

    // Generate slots for the next 30 days
    for (let daysAhead = 0; daysAhead < 30; daysAhead++) {
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() + daysAhead);
      
      // Get the date components in the reader's timezone
      const dateFormatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: readerTimezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      const dateStr = dateFormatter.format(targetDate);
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
      
      // Check each template
      for (const template of templates) {
        if (targetDayOfWeek !== template.dayOfWeek) continue;
        
        // Parse template times (e.g., "09:00" to "17:00")
        const [startHour, startMinute] = (template.startTime as string).split(':').map(Number);
        const [endHour, endMinute] = (template.endTime as string).split(':').map(Number);
        
        const startTotalMinutes = startHour * 60 + startMinute;
        const endTotalMinutes = endHour * 60 + endMinute;
        
        // Create 30-minute slots
        for (let currentMin = startTotalMinutes; currentMin < endTotalMinutes; currentMin += 30) {
          const slotHour = Math.floor(currentMin / 60);
          const slotMinute = currentMin % 60;
          
          // Convert reader's local time to UTC
          const slotStartUTC = localTimeToUTC(year, month, day, slotHour, slotMinute, readerTimezone);
          const slotEndUTC = new Date(slotStartUTC.getTime() + 30 * 60 * 1000);
          
          const slotKey = slotStartUTC.getTime();
          
          // Skip if already booked or already added
          if (bookedSlotTimes.has(slotKey)) continue;
          if (slotMap.has(slotKey)) continue;
          
          slotMap.set(slotKey, {
            id: randomUUID(),
            userId,
            startTime: slotStartUTC,
            endTime: slotEndUTC,
            isBooked: false,
            updatedAt: new Date(),
          });
        }
      }
    }

    const slotsToCreate = Array.from(slotMap.values());

    if (slotsToCreate.length > 0) {
      await prisma.availabilitySlot.createMany({
        data: slotsToCreate,
      });
      
      // Log sample for debugging
      const sample = slotsToCreate[0];
      console.log(`[REGEN] Created ${slotsToCreate.length} slots`);
      console.log(`[REGEN] Sample slot UTC: ${sample.startTime.toISOString()}`);
      console.log(`[REGEN] Sample in ${readerTimezone}: ${sample.startTime.toLocaleString('en-US', { timeZone: readerTimezone })}`);
    } else {
      console.log(`[REGEN] No slots to create`);
    }

  } catch (error) {
    console.error(`[REGEN] Error:`, error);
    throw error;
  }
}