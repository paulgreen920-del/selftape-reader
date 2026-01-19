import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type TimeSlot = {
  dayOfWeek: number;
  startMin: number;
  endMin: number;
};

// Convert local time to UTC
function localTimeToUTC(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timezone: string
): Date {
  // Create a date at noon UTC on the target day to get timezone offset
  const noonUTC = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));

  // Format this UTC time in the target timezone
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
  
  // Calculate offset: if noon UTC shows as 7:00 in EST, offset is -5 hours
  const offsetHours = tzHour - 12;
  const offsetMinutes = offsetHours * 60;

  // Create the local time as if it were UTC
  const localAsUTC = new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0));
  
  // Subtract offset to get actual UTC time
  // If offset is -5 (EST), we add 5 hours to get UTC
  localAsUTC.setUTCMinutes(localAsUTC.getUTCMinutes() - offsetMinutes);

  return localAsUTC;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, slots, timezone } = body as { 
      userId: string; 
      slots: TimeSlot[]; 
      timezone?: string;
    };

    if (!userId) {
      return NextResponse.json({ ok: false, error: "Missing userId" }, { status: 400 });
    }

    if (!Array.isArray(slots) || slots.length === 0) {
      return NextResponse.json({ ok: false, error: "No availability slots provided" }, { status: 400 });
    }

    // Get user's timezone from database if not provided
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { timezone: true },
    });
    
    const userTimezone = timezone || user?.timezone || "America/New_York";
    console.log(`[availability] Using timezone: ${userTimezone}`);

    // Validate slots
    for (const slot of slots) {
      if (slot.dayOfWeek < 0 || slot.dayOfWeek > 6) {
        return NextResponse.json({ ok: false, error: "Invalid day of week" }, { status: 400 });
      }
      if (slot.startMin < 0 || slot.startMin >= 1440) {
        return NextResponse.json({ ok: false, error: "Invalid start time" }, { status: 400 });
      }
      if (slot.endMin < 0 || slot.endMin > 1440) {
        return NextResponse.json({ ok: false, error: "Invalid end time" }, { status: 400 });
      }
      if (slot.startMin >= slot.endMin) {
        return NextResponse.json({ ok: false, error: "Start time must be before end time" }, { status: 400 });
      }
    }

    // Delete existing slots AND templates for this user
    await prisma.availabilitySlot.deleteMany({
      where: { userId },
    });
    
    await prisma.availabilityTemplate.deleteMany({
      where: { userId },
    });

    // Create templates from the slots
    const templatesToCreate = slots.map((slot, index) => ({
      id: `template_${Date.now()}_${userId}_${index}`,
      userId,
      dayOfWeek: slot.dayOfWeek,
      startTime: `${Math.floor(slot.startMin / 60).toString().padStart(2, '0')}:${(slot.startMin % 60).toString().padStart(2, '0')}`,
      endTime: `${Math.floor(slot.endMin / 60).toString().padStart(2, '0')}:${(slot.endMin % 60).toString().padStart(2, '0')}`,
      isActive: true,
      updatedAt: new Date(),
    }));

    await prisma.availabilityTemplate.createMany({
      data: templatesToCreate,
    });

    // Convert each slot to actual date/time for the next 30 days
    // Use the user's timezone for proper conversion
    const now = new Date();
    const slotsToCreate: any[] = [];
    let slotCounter = 0;

    // Get current date in user's timezone
    const dateFormatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: userTimezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    for (let daysAhead = 0; daysAhead < 30; daysAhead++) {
      // Calculate target date in user's timezone
      const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
      const dateStr = dateFormatter.format(futureDate);
      const [year, month, day] = dateStr.split("-").map(Number);
      
      // Get day of week for this date
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

      slots.forEach((slot) => {
        if (dayOfWeek === slot.dayOfWeek) {
          const startHour = Math.floor(slot.startMin / 60);
          const startMinute = slot.startMin % 60;
          const endHour = Math.floor(slot.endMin / 60);
          const endMinute = slot.endMin % 60;

          // Convert local time to UTC
          const startTimeUTC = localTimeToUTC(year, month, day, startHour, startMinute, userTimezone);
          const endTimeUTC = localTimeToUTC(year, month, day, endHour, endMinute, userTimezone);

          console.log(`[availability] Slot: ${year}-${month}-${day} ${startHour}:${startMinute} ${userTimezone} -> ${startTimeUTC.toISOString()} UTC`);

          slotsToCreate.push({
            id: `slot_${Date.now()}_${userId}_${slotCounter++}`,
            userId,
            startTime: startTimeUTC,
            endTime: endTimeUTC,
            isBooked: false,
            updatedAt: new Date(),
          });
        }
      });
    }

    // Create new slots
    if (slotsToCreate.length > 0) {
      await prisma.availabilitySlot.createMany({
        data: slotsToCreate,
      });
    }

    console.log(`[availability] Created ${slotsToCreate.length} slots for user ${userId}`);

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: any) {
    console.error("[availability] Error:", err);
    return NextResponse.json({ ok: false, error: err.message || "Failed to save" }, { status: 500 });
  }
}