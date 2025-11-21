// app/api/calendar/google/callback/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type GoogleTokenResponse = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  token_type: "Bearer";
  id_token?: string;
};

function tryParseState(stateRaw: string | null): { readerId?: string; provider?: string } {
  if (!stateRaw) return {};
  try {
    const asJson = JSON.parse(Buffer.from(stateRaw, "base64").toString("utf8"));
    return asJson ?? {};
  } catch {}
  try {
    return JSON.parse(decodeURIComponent(stateRaw));
  } catch {}
  return {};
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const stateRaw = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error) {
      return NextResponse.redirect(
        new URL(
          `/onboarding/schedule?error=${encodeURIComponent(error)}`,
          process.env.NEXT_PUBLIC_URL || "http://localhost:3000"
        )
      );
    }

    if (!code) {
      return NextResponse.json({ ok: false, error: "Missing ?code" }, { status: 400 });
    }

    const state = tryParseState(stateRaw);
    const readerId = state.readerId || "";
    const userId = readerId; // Map for internal use

    if (!readerId) {
      return NextResponse.json({ ok: false, error: "Missing readerId in state" }, { status: 400 });
    }

    const client_id = process.env.GOOGLE_CLIENT_ID!;
    const client_secret = process.env.GOOGLE_CLIENT_SECRET!;
    const redirect_uri =
      process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/calendar/google/callback";

    // Exchange code → tokens
    const body = new URLSearchParams({
      code,
      client_id,
      client_secret,
      redirect_uri,
      grant_type: "authorization_code",
    });

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    const raw = await tokenRes.text();
    let tokenData: GoogleTokenResponse | null = null;
    try {
      tokenData = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { ok: false, error: `Non-JSON token response from Google`, body: raw?.slice(0, 300) },
        { status: 502 }
      );
    }

    if (!tokenRes.ok || !tokenData?.access_token) {
      return NextResponse.json(
        { ok: false, error: `Google token error (${tokenRes.status})`, data: tokenData },
        { status: 502 }
      );
    }

    // Compute expiry
    const expiresAt = new Date(Date.now() + (tokenData.expires_in ?? 3600) * 1000);

    // Save to database using upsert (create or update)
    // Debug logging
    console.log("[callback] prisma object:", prisma);
    console.log("[callback] prisma.calendarConnection:", prisma.calendarConnection);
    console.log("[callback] Available prisma methods:", Object.keys(prisma));

    // Save to database using upsert (create or update)
    // First try to find existing connection
    const existingConnection = await prisma.calendarConnection.findFirst({
      where: {
        userId: userId,
        provider: "GOOGLE",
      },
    });

    if (existingConnection) {
      // Update existing connection
      await prisma.calendarConnection.update({
        where: { id: existingConnection.id },
        data: {
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token || "",
          expiresAt: expiresAt,
        },
      });
    } else {
      // Create new connection
      await prisma.calendarConnection.create({
        data: {
          id: `cal_${Date.now()}_${userId}`,
          userId: userId,
          provider: "GOOGLE",
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token || "",
          expiresAt: expiresAt,
          updatedAt: new Date(),
        },
      });
    }

    // Redirect back to onboarding with success
    const res = NextResponse.redirect(
      new URL(
        `/onboarding/schedule?readerId=${encodeURIComponent(readerId)}&connected=google`,
        process.env.NEXT_PUBLIC_URL || "http://localhost:3000"
      )
    );

    res.cookies.set("gcal_connected", "1", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return res;
  } catch (e: any) {
    console.error("[callback] Error:", e);
    return NextResponse.json(
      { ok: false, error: e?.message || "Callback failed" },
      { status: 500 }
    );
  }
}
