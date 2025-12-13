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
  // Find all bookings where status='PENDING' and createdAt < 15 minutes ago
  const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000);
  const bookings = await prisma.booking.findMany({
    where: {
      status: "PENDING",
      createdAt: { lt: fifteenMinAgo },
    },
  });
  const ids = bookings.map(b => b.id);
  await prisma.booking.updateMany({
    where: { id: { in: ids } },
    data: { status: "EXPIRED" },
  });
  return NextResponse.json({ ok: true, count: ids.length });
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 403 });
  }
  // Count pending bookings older than 15 min
  const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000);
  const count = await prisma.booking.count({
    where: {
      status: "PENDING",
      createdAt: { lt: fifteenMinAgo },
    },
  });
  return NextResponse.json({ ok: true, count });
}
