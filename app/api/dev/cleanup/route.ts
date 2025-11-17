// app/api/dev/cleanup/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { readerId, actorId, startTime, endTime } = await req.json();

    if (!readerId || !actorId || !startTime || !endTime) {
      return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    const rows = await prisma.booking.findMany({
      where: { 
        readerId, 
        actorId, 
        startTime: start, 
        endTime: end 
      },
      select: { id: true, createdAt: true },
      orderBy: { createdAt: "asc" }, // keep the oldest one
    });

    if (rows.length <= 1) {
      return NextResponse.json({ ok: true, kept: rows[0]?.id ?? null, deleted: 0 });
    }

    const keepId = rows[0].id;
    const toDelete = rows.slice(1).map(r => r.id);

    for (const id of toDelete) {
      await prisma.booking.delete({ where: { id } });
    }

    return NextResponse.json({ ok: true, kept: keepId, deleted: toDelete.length });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
