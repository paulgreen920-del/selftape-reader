import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

type TimeSlot = {
  dayOfWeek: number;
  startMin: number;
  endMin: number;
};

type TemplateInput = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
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

// GET - Fetch user's availability templates
export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
    }

    const templates = await prisma.availabilityTemplate.findMany({
      where: { userId: currentUser.id },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    });

    // If no templates exist, return default Mon-Fri 9am-5pm
    if (templates.length === 0) {
      const defaultTemplates = [
        { id: "default-1", dayOfWeek: 1, startTime: "09:00", endTime: "17:00", isActive: true },
        { id: "default-2", dayOfWeek: 2, startTime: "09:00", endTime: "17:00", isActive: true },
        { id: "default-3", dayOfWeek: 3, startTime: "09:00", endTime: "17:00", isActive: true },
        { id: "default-4", dayOfWeek: 4, startTime: "09:00", endTime: "17:00", isActive: true },
        { id: "default-5", dayOfWeek: 5, startTime: "09:00", endTime: "17:00", isActive: true },
      ];
      return NextResponse.json({ ok: true, templates: defaultTemplates }, { status: 200 });
    }

    return NextResponse.json({ ok: true, templates }, { status: 200 });
  } catch (err: any) {
    console.error("[GET /api/availability/templates] error:", err);
    return NextResponse.json({ ok: false, error: err.message || "Server error" }, { status: 500 });
  }
}

// PUT - Update user's availability templates (called from frontend)
export async function PUT(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const { templates } = body as { templates: TemplateInput[] };

    if (!Array.isArray(templates)) {
      return NextResponse.json({ ok: false, error: "Invalid templates" }, { status: 400 });
    }

    // Get user's timezone
    const user = await prisma.user.findUnique({
      where: { id: currentUser.id },
      select: { timezone: true },
    });
    const userTimezone = user?.timezone || "America/New_York";

    // Delete existing templates
    await prisma.availabilityTemplate.deleteMany({
      where: { userId: currentUser.id },
    });

    // Delete existing slots
    await prisma.availabilitySlot.deleteMany({
      where: { userId: currentUser.id },
    });

    if (templates.length === 0) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    // Create new templates
    const templatesToCreate = templates.map((template, index) => ({
      id: `template_${Date.now()}_${currentUser.id}_${index}`,
      userId: currentUser.id,
      dayOfWeek: template.dayOfWeek,
      startTime: template.startTime,
      endTime: template.endTime,
      isActive: true,
      updatedAt: new Date(),
    }));

    await prisma.availabilityTemplate.createMany({
      data: templatesToCreate,
    });

    // Convert templates to slots for the next 30 days
    const now = new Date();
    const slotsToCreate: any[] = [];
    let slotCounter = 0;

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

      templates.forEach((template) => {
        if (dayOfWeek === template.dayOfWeek) {
          const [startHour, startMinute] = template.startTime.split(":").map(Number);
          const [endHour, endMinute] = template.endTime.split(":").map(Number);

          const startTimeUTC = localTimeToUTC(year, month, day, startHour, startMinute, userTimezone);
          const endTimeUTC = localTimeToUTC(year, month, day, endHour, endMinute, userTimezone);

          slotsToCreate.push({
            id: `slot_${Date.now()}_${currentUser.id}_${slotCounter++}`,
            userId: currentUser.id,
            startTime: startTimeUTC,
            endTime: endTimeUTC,
            isBooked: false,
            updatedAt: new Date(),
          });
        }
      });
    }

    if (slotsToCreate.length > 0) {
      await prisma.availabilitySlot.createMany({
        data: slotsToCreate,
      });
    }

    console.log(`[availability] Created ${slotsToCreate.length} slots for user ${currentUser.id}`);

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: any) {
    console.error("[PUT /api/availability/templates] error:", err);
    return NextResponse.json({ ok: false, error: err.message || "Failed to save" }, { status: 500 });
  }
}

// POST - Alternative endpoint (for backward compatibility)
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
    const now = new Date();
    const slotsToCreate: any[] = [];
    let slotCounter = 0;

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

          const startTimeUTC = localTimeToUTC(year, month, day, startHour, startMinute, userTimezone);
          const endTimeUTC = localTimeToUTC(year, month, day, endHour, endMinute, userTimezone);

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