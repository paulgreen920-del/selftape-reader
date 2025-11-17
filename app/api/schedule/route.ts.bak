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

    // Ensure reader exists (requires they finished page 1 with email)
    const reader = await prisma.reader.upsert({
      where: { email },
      update: { timezone },
      create: { email, displayName: email.split("@")[0], timezone },
    });

    // Clean + validate availability
    const slots = availability
      .map((s: any) => ({
        dayOfWeek: Number(s.dayOfWeek),
        startMin: Number(s.startMin),
        endMin: Number(s.endMin),
      }))
      .filter(
        (s) =>
          Number.isInteger(s.dayOfWeek) &&
          s.dayOfWeek >= 0 &&
          s.dayOfWeek <= 6 &&
          Number.isInteger(s.startMin) &&
          Number.isInteger(s.endMin) &&
          s.startMin < s.endMin
      );

    // Replace all existing slots for this reader
    await prisma.availabilitySlot.deleteMany({ where: { readerId: reader.id } });
    if (slots.length) {
      await prisma.availabilitySlot.createMany({
        data: slots.map((s) => ({ ...s, readerId: reader.id })),
      });
    }

    // Return a stub booking link path; we’ll build the page next
    const bookingPath = `/book/${reader.id}`;
    return NextResponse.json({ ok: true, bookingPath, readerId: reader.id });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
