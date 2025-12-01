import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
	const { searchParams } = new URL(req.url);
	const userId = searchParams.get("userId");
	const date = searchParams.get("date"); // YYYY-MM-DD
  
	const slots = await prisma.availabilitySlot.findMany({
		where: { 
			userId: userId || undefined,
		},
		orderBy: { startTime: 'asc' },
		take: 20
	});
  
	return NextResponse.json({ 
		slots: slots.map(s => ({
			id: s.id,
			startTime: s.startTime,
			startTimeISO: s.startTime.toISOString(),
			isBooked: s.isBooked
		}))
	});
}

