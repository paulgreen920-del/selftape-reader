// app/api/calendar/google/start/route.ts
import { NextResponse } from "next/server";

const GOOGLE_AUTH_BASE = "https://accounts.google.com/o/oauth2/v2/auth";
const SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly",
];

function b64url(input: string) {
  return Buffer.from(input).toString("base64url");
}

function makeState(readerId: string) {
  // You can later sign/encrypt this. For now, keep it simple.
  return b64url(JSON.stringify({ readerId, provider: "google" }));
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const readerId = (url.searchParams.get("readerId") || "").trim();
  if (!readerId) {
    return NextResponse.json({ ok: false, error: "Missing readerId" }, { status: 400 });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID || "";
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || ""; // e.g., http://localhost:3000/api/calendar/google/callback

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Missing GOOGLE_CLIENT_ID or GOOGLE_REDIRECT_URI in environment. Set those in .env.local and restart dev.",
      },
      { status: 500 }
    );
  }

  const qp = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    access_type: "offline",
    include_granted_scopes: "true",
    scope: SCOPES.join(" "),
    state: makeState(readerId),
    prompt: "consent",
  });

  const authUrl = `${GOOGLE_AUTH_BASE}?${qp.toString()}`;
  return NextResponse.json({ ok: true, authUrl }, { status: 200 });
}
