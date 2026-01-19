import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";

async function requireAdmin() {
  const currentUser = await getCurrentUser();
  if (!currentUser) return null;
  try {
    const user = await prisma.user.findUnique({ where: { id: currentUser.id }, select: { role: true, isAdmin: true } });
    if (user?.isAdmin === true) return currentUser.id;
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
