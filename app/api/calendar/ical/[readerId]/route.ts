// app/api/calendar/ical/[readerId]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** Format a Date to ICS UTC like 20251108T150000Z */
function icsDate(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const year = d.getUTCFullYear();
  const mon = pad(d.getUTCMonth() + 1);
  const day = pad(d.getUTCDate());
  const h = pad(d.getUTCHours());
  const m = pad(d.getUTCMinutes());
  const s = pad(d.getUTCSeconds());
  return `${year}${mon}${day}T${h}${m}${s}Z`;
}

/** Escape text per RFC5545 */
function icsEscape(s: string) {
  return (s || "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ readerId: string }> } // Next 16 can pass params as a Promise
) {
  const { readerId } = await ctx.params;
  const userId = readerId; // Map for internal use
  const id = (readerId || "").trim();

  if (!id) {
    return new NextResponse("Missing readerId", { status: 400 });
  }

  // Load user (for calendar name) and bookings
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, displayName: true, email: true },
  });

  if (!user) {
    return new NextResponse("User not found", { status: 404 });
  }

  const bookings = await prisma.booking.findMany({
    where: { readerId: id },
    orderBy: { startTime: "asc" },
    take: 500, // safety cap
    include: {
      User_Booking_actorIdToUser: true, // Include actor details if available
    },
  });

  const now = new Date();

  const lines: string[] = [];
  lines.push("BEGIN:VCALENDAR");
  lines.push("VERSION:2.0");
  lines.push("PRODID:-//Reader Marketplace//Calendar Feed//EN");
  lines.push("CALSCALE:GREGORIAN");
  lines.push(`X-WR-CALNAME:${icsEscape(user.displayName || user.email || "Reader Bookings")}`);
  lines.push("METHOD:PUBLISH");

  for (const b of bookings) {
    const uid = `${b.id}@reader-marketplace`;
    const dtstart = icsDate(new Date(b.startTime));
    const dtend = icsDate(new Date(b.endTime));
    const created = icsDate(new Date(b.createdAt));
    const updated = icsDate(new Date(b.updatedAt));

    const summary = `Self-Tape Session with ${b.User_Booking_actorIdToUser.displayName || b.User_Booking_actorIdToUser.name}`;
    const status = b.status === "CANCELED" ? "CANCELLED" : "CONFIRMED";
    
    const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';
    const cancelUrl = `${baseUrl}/bookings/${b.id}/cancel`;
    const rescheduleUrl = `${baseUrl}/bookings/${b.id}/reschedule`;
    const reportUrl = `${baseUrl}/bookings/${b.id}/report`;
    
    const descParts = [
      `Actor: ${b.User_Booking_actorIdToUser.displayName || b.User_Booking_actorIdToUser.name} <${b.User_Booking_actorIdToUser.email}>`,
      `Status: ${b.status}`,
      b.meetingUrl ? `Meeting: ${b.meetingUrl}` : "",
      "",
      "--- ACTIONS ---",
      `Reschedule (2+ hrs notice): ${rescheduleUrl}`,
      `Cancel Booking: ${cancelUrl}`,
      `Report Issue: ${reportUrl}`,
      "",
      "--- CANCELLATION POLICY ---",
      "• Cancel 24+ hours: No penalty",
      "• Cancel under 24 hours: Warning + refund to actor",
      "• No-show: 14-day suspension",
      "• Late 5+ min: Session auto-extends",
      "",
      b.notes ? `Notes: ${b.notes}` : "",
    ].filter(Boolean);

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${icsDate(now)}`);
    lines.push(`DTSTART:${dtstart}`);
    lines.push(`DTEND:${dtend}`);
    lines.push(`CREATED:${created}`);
    lines.push(`LAST-MODIFIED:${updated}`);
    lines.push(`SUMMARY:${icsEscape(summary)}`);
    lines.push(`DESCRIPTION:${icsEscape(descParts.join("\n"))}`);
    lines.push(`STATUS:${status}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  const icsBody = lines.join("\r\n");

  return new NextResponse(icsBody, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="reader-${user.id}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
