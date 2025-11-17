import { NextResponse } from "next/server";

console.log("[daily] API Key loaded:", !!process.env.DAILY_API_KEY);
const DAILY_API_KEY = process.env.DAILY_API_KEY;
const DAILY_API_BASE = "https://api.daily.co/v1";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { bookingId, readerName, actorName } = body;

    if (!bookingId) {
      return NextResponse.json({ ok: false, error: "Missing bookingId" }, { status: 400 });
    }

    if (!DAILY_API_KEY) {
      return NextResponse.json({ ok: false, error: "Daily.co API key not configured" }, { status: 500 });
    }

    // Create a Daily.co room
    const roomResponse = await fetch(`${DAILY_API_BASE}/rooms`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DAILY_API_KEY}`,
      },
      body: JSON.stringify({
        name: `booking-${bookingId}`,
        privacy: "public",
        properties: {
          enable_screenshare: true,
          enable_chat: true,
          enable_knocking: false,
          start_video_off: false,
          start_audio_off: false,
          exp: Math.floor(Date.now() / 1000) + 60 * 60 * 3,
        },
      }),
    });

    if (!roomResponse.ok) {
      const error = await roomResponse.text();
      console.error("[daily] Room creation failed:", error);
      return NextResponse.json(
        { ok: false, error: "Failed to create meeting room" },
        { status: 500 }
      );
    }

    const room = await roomResponse.json();

    return NextResponse.json({
      ok: true,
      roomUrl: room.url,
      roomName: room.name,
    });
  } catch (err: any) {
    console.error("[daily] Error:", err);
    return NextResponse.json({ ok: false, error: err.message || "Failed to create room" }, { status: 500 });
  }
}
