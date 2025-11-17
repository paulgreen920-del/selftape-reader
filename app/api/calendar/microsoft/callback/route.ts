// app/api/calendar/microsoft/callback/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const MS_TOKEN_ENDPOINT = "https://login.microsoftonline.com/common/oauth2/v2.0/token";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error) {
      console.error("[MS Callback] OAuth error:", error);
      return NextResponse.redirect(new URL(`/onboarding/schedule?error=${error}`, req.url));
    }
    if (!code || !state) {
      return NextResponse.redirect(new URL('/onboarding/schedule?error=missing_params', req.url));
    }

    let parsed: any = null;
    try {
      parsed = JSON.parse(Buffer.from(state, "base64url").toString("utf8"));
    } catch {
      return NextResponse.redirect(new URL('/onboarding/schedule?error=invalid_state', req.url));
    }

    const readerId = parsed.readerId;
    if (!readerId) {
      return NextResponse.redirect(new URL('/onboarding/schedule?error=no_reader_id', req.url));
    }

    // Exchange code for tokens
    const tokenParams = new URLSearchParams({
      client_id: process.env.MS_CLIENT_ID!,
      client_secret: process.env.MS_CLIENT_SECRET!,
      code: code,
      redirect_uri: process.env.MS_REDIRECT_URI!,
      grant_type: "authorization_code",
    });

    const tokenResponse = await fetch(MS_TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenParams.toString(),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("[MS Callback] Token exchange failed:", errorData);
      return NextResponse.redirect(new URL('/onboarding/schedule?error=token_exchange_failed', req.url));
    }

    const tokens = await tokenResponse.json();
    const { access_token, refresh_token } = tokens;

    // Get user's email from Microsoft Graph
    const graphResponse = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    let email = "unknown@microsoft.com";
    if (graphResponse.ok) {
      const profile = await graphResponse.json();
      email = profile.mail || profile.userPrincipalName || email;
    }

    // Delete existing Microsoft connection for this user
    await prisma.calendarConnection.deleteMany({
      where: { 
        userId: readerId,
        provider: 'MICROSOFT'
      }
    });

    // Store the connection
    await prisma.calendarConnection.create({
      data: {
        id: `cal_${Date.now()}_${readerId}`,
        userId: readerId,
        provider: "MICROSOFT",
        email,
        accessToken: access_token,
        refreshToken: refresh_token || null,
        updatedAt: new Date(),
      },
    });

    console.log(`[MS Callback] Successfully connected Microsoft calendar for reader ${readerId}`);

    // Redirect back to schedule page
    return NextResponse.redirect(new URL('/onboarding/schedule?connected=microsoft', req.url));
  } catch (e: any) {
    console.error("[MS Callback] Error:", e);
    return NextResponse.redirect(new URL('/onboarding/schedule?error=unknown', req.url));
  }
}
