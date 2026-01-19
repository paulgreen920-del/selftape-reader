import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
// TODO: Implement or import getCalendarEvents from your calendar logic

// Helper to check admin
async function requireAdmin() {
  const currentUser = await getCurrentUser();
  if (!currentUser) return null;
  try {
    const user = await prisma.user.findUnique({ where: { id: currentUser.id }, select: { role: true, isAdmin: true } });
    // ADMIN has all reader permissions plus admin dashboard access
    if (user?.isAdmin === true || user?.role === "READER") return currentUser.id;
  } catch {}
  return null;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const readerId = url.searchParams.get("readerId");
  const date = url.searchParams.get("date");
  const type = url.searchParams.get("type");

  if (!(await requireAdmin())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 403 });
  }
  if (!readerId) {
    return NextResponse.json({ ok: false, error: "Missing readerId" }, { status: 400 });
  }

  if (type === "templates") {
    const templates = await prisma.availabilityTemplate.findMany({ where: { userId: readerId } });
    return NextResponse.json({ ok: true, templates });
  }
  if (type === "slots" && date) {
    const slots = await prisma.availabilitySlot.findMany({
      where: {
        userId: readerId,
        startTime: {
          gte: new Date(date + "T00:00:00Z"),
          lt: new Date(date + "T23:59:59Z"),
        },
      },
    });
    return NextResponse.json({ ok: true, slots });
  }
  if (type === "calendar" && date) {
    // TODO: Implement calendar event fetching for admin
    // const events = await getCalendarEvents(readerId, date);
    const events: any[] = [];
    return NextResponse.json({ ok: true, events });
  }
  return NextResponse.json({ ok: false, error: "Invalid type or missing date" }, { status: 400 });
}
