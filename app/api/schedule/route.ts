// app/api/schedule/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { email, timezone, availability } = await req.json();

    if (!email || !timezone || !Array.isArray(availability)) {
      return NextResponse.json(
        { error: "email, timezone, and availability[] are required" },
        { status: 400 }
      );
    }

    // Ensure user exists with READER role (requires they finished page 1 with email)
    const user = await prisma.user.upsert({
      where: { email },
      update: { timezone },
      create: { 
        id: `user_${Date.now()}_${require('crypto').randomBytes(12).toString('base64url')}`,
        email, 
        name: email.split("@")[0],
        displayName: email.split("@")[0], 
        timezone,
        role: "READER",
        password: "", // Will be set during proper signup
        updatedAt: new Date(),
      },
    });

    // Clean + validate availability and convert to Date-based slots
    const validSlots = availability
      .filter((s: any) => {
        const dayOfWeek = Number(s.dayOfWeek);
        const startMin = Number(s.startMin);
        const endMin = Number(s.endMin);
        return (
          Number.isInteger(dayOfWeek) &&
          dayOfWeek >= 0 &&
          dayOfWeek <= 6 &&
          Number.isInteger(startMin) &&
          Number.isInteger(endMin) &&
          startMin < endMin
        );
      });

    // Replace all existing slots for this user
    await prisma.availabilitySlot.deleteMany({ where: { userId: user.id } });
    
    if (validSlots.length) {
      // Convert dayOfWeek/startMin/endMin to actual DateTime slots
      const dateSlots = [];
      const today = new Date();
      
      // Generate slots for the next 4 weeks
      for (let week = 0; week < 4; week++) {
        for (const slot of validSlots) {
          const dayOfWeek = Number(slot.dayOfWeek);
          const startMin = Number(slot.startMin);
          const endMin = Number(slot.endMin);
          
          // Find the next occurrence of this day of week
          const targetDate = new Date(today);
          targetDate.setDate(today.getDate() + (week * 7) + (dayOfWeek - today.getDay() + 7) % 7);
          
          // Create start and end times
          const startTime = new Date(targetDate);
          startTime.setHours(Math.floor(startMin / 60), startMin % 60, 0, 0);
          
          const endTime = new Date(targetDate);
          endTime.setHours(Math.floor(endMin / 60), endMin % 60, 0, 0);
          
          dateSlots.push({
            userId: user.id,
            startTime,
            endTime,
            isBooked: false,
          });
        }
      }
      
      await prisma.availabilitySlot.createMany({
        data: dateSlots.map((slot: any, index: number) => ({
          ...slot,
          id: `slot_${Date.now()}_${index}`,
          updatedAt: new Date(),
        })),
      });
    }

    // Return a stub booking link path; we'll build the page next
    const bookingPath = `/book/${user.id}`;
    return NextResponse.json({ ok: true, bookingPath, readerId: user.id });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
