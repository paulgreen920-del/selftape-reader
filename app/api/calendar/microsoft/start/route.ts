// app/api/calendar/microsoft/start/route.ts
import { NextResponse } from "next/server";

const MS_AUTH_BASE = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize";
const SCOPES = [
  "offline_access",
  "Calendars.Read",
  "Calendars.ReadWrite",
].join(" ");

function makeState(readerId: string) {
  return Buffer.from(JSON.stringify({ readerId, provider: "microsoft" })).toString("base64url");
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const readerId = (url.searchParams.get("readerId") || "").trim();
  if (!readerId) {
    return NextResponse.json({ ok: false, error: "Missing readerId" }, { status: 400 });
  }

  const clientId = process.env.MS_CLIENT_ID || "";
  const redirectUri = process.env.MS_REDIRECT_URI || ""; // e.g. http://localhost:3000/api/calendar/microsoft/callback

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      {
        ok: false,
        error: "Missing MS_CLIENT_ID or MS_REDIRECT_URI in environment. Set those first.",
      },
      { status: 500 }
    );
  }

  const qp = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    response_mode: "query",
    scope: SCOPES,
    state: makeState(readerId),
    prompt: "select_account",
  });

  const authUrl = `${MS_AUTH_BASE}?${qp.toString()}`;
  return NextResponse.json({ ok: true, authUrl }, { status: 200 });
}
