import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

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
async function regenerateAvailabilitySlots(userId: string, userTimezone: string): Promise<number> {
  console.log(`[regenerate-slots] Starting for user ${userId}`);

  try {
    // Delete existing unbooked future slots
    const deleteResult = await prisma.availabilitySlot.deleteMany({
      where: {
        userId,
        isBooked: false,
      },
    });
    console.log(`[regenerate-slots] Deleted ${deleteResult.count} existing unbooked slots`);

    // Get active templates
    const templates = await prisma.availabilityTemplate.findMany({
      where: {
        userId,
        isActive: true,
      },
    });

    if (templates.length === 0) {
      console.log(`[regenerate-slots] No active templates for user ${userId}`);
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
        Sun: 0,
        Mon: 1,
        Tue: 2,
        Wed: 3,
        Thu: 4,
        Fri: 5,
        Sat: 6,
      };
      const dayOfWeek = dayOfWeekMap[dayName];

      // Find templates for this day
      const dayTemplates = templates.filter((t) => t.dayOfWeek === dayOfWeek);

      for (const template of dayTemplates) {
        const [startHour, startMin] = template.startTime.split(":").map(Number);
        const [endHour, endMin] = template.endTime.split(":").map(Number);

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

    if (slotsToCreate.length > 0) {
      await prisma.availabilitySlot.createMany({
        data: slotsToCreate,
        skipDuplicates: true,
      });
      console.log(`[regenerate-slots] Created ${slotsToCreate.length} slots for user ${userId}`);
    }

    return slotsToCreate.length;
  } catch (error) {
    console.error(`[regenerate-slots] Error for user ${userId}:`, error);
    throw error;
  }
}

export async function GET(req: Request) {
  try {
    // Verify cron secret
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();

    // Find all readers with active templates
    const readersWithTemplates = await prisma.user.findMany({
      where: {
        role: "READER",
        AvailabilityTemplate: {
          some: {
            isActive: true,
          },
        },
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        name: true,
        timezone: true,
        AvailabilityTemplate: {
          where: { isActive: true },
        },
        AvailabilitySlot: {
          where: {
            startTime: { gt: now },
            isBooked: false,
          },
          take: 1, // Just need to know if any future slots exist
        },
      },
    });

    console.log(`[regenerate-slots] Found ${readersWithTemplates.length} readers with templates`);

    // Filter to readers with no future slots
    const readersNeedingSlots = readersWithTemplates.filter(
      (reader) => reader.AvailabilitySlot.length === 0
    );

    console.log(`[regenerate-slots] ${readersNeedingSlots.length} readers need slot regeneration`);

    let regenerated = 0;
    const results: string[] = [];

    for (const reader of readersNeedingSlots) {
      try {
        const userTimezone = reader.timezone || "America/New_York";
        const slotsCreated = await regenerateAvailabilitySlots(reader.id, userTimezone);

        const readerName = reader.displayName || reader.name || reader.email;
        console.log(`[regenerate-slots] ${readerName}: ${slotsCreated} slots created`);
        results.push(`${readerName}: ${slotsCreated} slots`);
        regenerated++;

        // Rate limiting: 100ms between regenerations to avoid DB overload
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (err: any) {
        console.error(`[regenerate-slots] Failed for ${reader.email}:`, err.message);
        results.push(`${reader.email}: ERROR - ${err.message}`);
      }
    }

    return NextResponse.json({
      ok: true,
      checked: readersWithTemplates.length,
      needingSlots: readersNeedingSlots.length,
      regenerated,
      results,
    });
  } catch (err: any) {
    console.error("[regenerate-slots] Error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
