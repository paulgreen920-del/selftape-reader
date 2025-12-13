import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import type { User, Booking, Role } from "@prisma/client";

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

export async function GET(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 403 });
  }
  const url = new URL(req.url);
  const type = url.searchParams.get("type");
  const format = url.searchParams.get("format") || "csv";
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const role = url.searchParams.get("role");

  let data: User[] | Booking[] = [];
  if (type === "users") {
    let where: { role?: Role } = {};
    if (role) {
      // Try to cast role string to enum
      where.role = role as Role;
    }
    data = await prisma.user.findMany({ where });
  } else if (type === "bookings") {
    let where: { startTime?: any; endTime?: any } = {};
    if (from) where.startTime = { gte: new Date(from) };
    if (to) where.endTime = { lte: new Date(to) };
    data = await prisma.booking.findMany({ where });
  }

  if (format === "json") {
    return NextResponse.json(data);
  }

  // CSV export
  const csvRows: string[] = [Object.keys(data[0] || {}).join(",")];
  for (const row of data) {
    csvRows.push(Object.values(row).map(v => `"${String(v).replace(/"/g, '""')}"`).join(","));
  }
  const csv = csvRows.join("\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename=${type}.csv`,
    },
  });
}
