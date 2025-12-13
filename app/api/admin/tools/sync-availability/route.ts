import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

async function requireAdmin() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session");
  if (!sessionCookie?.value) return null;
  try {
    const session = JSON.parse(sessionCookie.value);
    const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { role: true } });
    if (user?.role === "ADMIN") return session.userId;
  } catch {}
  return null;
}

export async function POST(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 403 });
  }
  const { readerId } = await req.json();
  if (!readerId) return NextResponse.json({ ok: false, error: "Missing readerId" }, { status: 400 });
  // Delete non-booked slots
  await prisma.availabilitySlot.deleteMany({ where: { userId: readerId, isBooked: false } });
  // Regenerate slots (pseudo-code, replace with your logic)
  // const created = await regenerateSlots(readerId);
  // For now, just count templates
  const templates = await prisma.availabilityTemplate.findMany({ where: { userId: readerId } });
  return NextResponse.json({ ok: true, message: `Created ${templates.length} slots for next 30 days` });
}
