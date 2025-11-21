import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type TimeSlot = {
  dayOfWeek: number;
  startMin: number;
  endMin: number;
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { readerId, slots } = body as { readerId: string; slots: TimeSlot[] };

    if (!readerId) {
      return NextResponse.json({ ok: false, error: "Missing userId" }, { status: 400 });
    }

    if (!Array.isArray(slots) || slots.length === 0) {
      return NextResponse.json({ ok: false, error: "No availability slots provided" }, { status: 400 });
    }

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
      where: { userId: readerId },
    });
    
    await prisma.availabilityTemplate.deleteMany({
      where: { userId: readerId },
    });

    // Create templates from the slots
    const templatesToCreate = slots.map((slot, index) => ({
      id: `template_${Date.now()}_${readerId}_${index}`,
      userId: readerId,
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

    for (let daysAhead = 0; daysAhead < 30; daysAhead++) {
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() + daysAhead);
      
      slots.forEach((slot) => {
        if (targetDate.getDay() === slot.dayOfWeek) {
          const startTime = new Date(targetDate);
          startTime.setHours(Math.floor(slot.startMin / 60), slot.startMin % 60, 0, 0);
          
          const endTime = new Date(targetDate);
          endTime.setHours(Math.floor(slot.endMin / 60), slot.endMin % 60, 0, 0);
          
          slotsToCreate.push({
            id: `slot_${Date.now()}_${readerId}_${slotCounter++}`,
            userId: readerId,
            startTime,
            endTime,
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

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: any) {
    console.error("[availability] Error:", err);
    return NextResponse.json({ ok: false, error: err.message || "Failed to save" }, { status: 500 });
  }
}
