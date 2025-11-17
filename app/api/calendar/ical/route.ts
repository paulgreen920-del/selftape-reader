// app/api/calendar/ical/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    route: "/api/calendar/ical",
    note: "If you see this JSON, the calendar/ical segment is wired correctly.",
  });
}
