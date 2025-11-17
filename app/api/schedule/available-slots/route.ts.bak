import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const readerId = searchParams.get("readerId");
    const date = searchParams.get("date"); // YYYY-MM-DD
    const durationMin = parseInt(searchParams.get("duration") || "30");

    console.log("[available-slots] Received date:", date);

    if (!readerId || !date) {
      return NextResponse.json({ ok: false, error: "Missing readerId or date" }, { status: 400 });
    }

    // Get reader with availability and settings
    const reader = await prisma.reader.findUnique({
      where: { id: readerId },
      include: {
        availability: true,
        calendars: {
          where: { provider: "GOOGLE" },
        },
      },
    });

    console.log("[available-slots] Reader availability:", reader?.availability);

    if (!reader) {
      return NextResponse.json({ ok: false, error: "Reader not found" }, { status: 404 });
    }

    // Check if date is within booking window
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const selectedDate = new Date(date + 'T12:00:00'); // Parse at noon to avoid timezone shift
    
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + reader.maxAdvanceBooking * 60 * 60 * 1000);

    if (selectedDate < today || selectedDate > maxDate) {
      return NextResponse.json({ ok: true, slots: [] });
    }

    // Get day of week in local context (not UTC)
    const dayOfWeek = new Date(date + 'T12:00:00').getDay();

    // Find availability for this day
    const dayAvailability = reader.availability.filter((slot) => slot.dayOfWeek === dayOfWeek);

    console.log("[available-slots] Date:", date, "Day of week:", dayOfWeek);
    console.log("[available-slots] Day availability:", dayAvailability);

    if (dayAvailability.length === 0) {
      return NextResponse.json({ ok: true, slots: [] });
    }

    // Generate time slots
    const slots: Array<{ startMin: number; endMin: number; startTime: string; endTime: string }> = [];

    for (const avail of dayAvailability) {
      let currentMin = avail.startMin;
      const buffer = 0; // No buffer

      while (currentMin + durationMin <= avail.endMin) {
        const slotStart = currentMin;
        const slotEnd = currentMin + durationMin;

        // Build timestamp - parse in local time
        const startTime = new Date(`${date}T${String(Math.floor(slotStart / 60)).padStart(2, '0')}:${String(slotStart % 60).padStart(2, '0')}:00`);
        const endTime = new Date(`${date}T${String(Math.floor(slotEnd / 60)).padStart(2, '0')}:${String(slotEnd % 60).padStart(2, '0')}:00`);

        slots.push({
          startMin: slotStart,
          endMin: slotEnd,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        });

        // Move to next slot
        currentMin += durationMin + buffer;
      }
    }

    // Filter out slots that don't meet minimum advance booking
    const now = new Date();
    const minBookingTime = new Date(now.getTime() + reader.minAdvanceHours * 60 * 60 * 1000);
    const futureSlots = slots.filter((slot) => {
      const slotStart = new Date(slot.startTime);
      return slotStart > minBookingTime;
    });

    // Check existing bookings for conflicts
    const existingBookings = await prisma.booking.findMany({
      where: {
        readerId,
        startTime: {
          gte: new Date(`${date}T00:00:00`),
          lt: new Date(`${date}T23:59:59`),
        },
        status: { in: ["PENDING", "PAID"] },
      },
      select: {
        startTime: true,
        endTime: true,
      },
    });

    // Filter out slots that conflict with existing bookings
    const availableSlots = futureSlots.filter((slot) => {
      const slotStart = new Date(slot.startTime);
      const slotEnd = new Date(slot.endTime);

      return !existingBookings.some((booking) => {
        return slotStart < booking.endTime && slotEnd > booking.startTime;
      });
    });

    return NextResponse.json({ ok: true, slots: availableSlots });
  } catch (err: any) {
    console.error("[available-slots] Error:", err);
    return NextResponse.json({ ok: false, error: err.message || "Failed to get slots" }, { status: 500 });
  }
}