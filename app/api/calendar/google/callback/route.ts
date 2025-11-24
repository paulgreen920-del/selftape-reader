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

function tryParseState(stateRaw: string | null): { readerId?: string; provider?: string; returnTo?: string } {
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
    const returnTo = state.returnTo || "onboarding"; // Track where user came from

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
    console.log("[callback] Saving calendar connection for user:", userId);

    // First try to find existing connection (any provider)
    const existingConnection = await prisma.calendarConnection.findFirst({
      where: { userId: userId },
    });

    if (existingConnection) {
      // Update existing connection (switching providers)
      await prisma.calendarConnection.update({
        where: { id: existingConnection.id },
        data: {
          provider: "GOOGLE",
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token || "",
          expiresAt: expiresAt,
          updatedAt: new Date(),
        },
      });
      console.log("[callback] Updated existing calendar connection to GOOGLE");
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
      console.log("[callback] Created new GOOGLE calendar connection");
    }

    // ⭐ REGENERATE AVAILABILITY SLOTS FROM TEMPLATES ⭐
    console.log("[callback] Regenerating availability slots for user:", userId);
    await regenerateAvailabilitySlots(userId);

    // Determine redirect URL based on where user came from
    let redirectUrl: string;
    if (returnTo === "dashboard") {
      // User was in dashboard - return to manage availability
      redirectUrl = `/reader/availability?connected=google`;
    } else {
      // User was in onboarding - continue to schedule step
      redirectUrl = `/onboarding/schedule?readerId=${encodeURIComponent(readerId)}&connected=google`;
    }

    console.log("[callback] Redirecting to:", redirectUrl, "(returnTo was:", returnTo, ")");

    const res = NextResponse.redirect(
      new URL(redirectUrl, process.env.NEXT_PUBLIC_URL || "http://localhost:3000")
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

// Regenerate availability slots from templates
async function regenerateAvailabilitySlots(userId: string) {
  console.log(`[callback:regenerateSlots] Starting regeneration for user ${userId}`);
  
  try {
    // Delete existing slots for this user (they were tied to old calendar)
    const deleteResult = await prisma.availabilitySlot.deleteMany({
      where: { userId }
    });
    console.log(`[callback:regenerateSlots] Deleted ${deleteResult.count} existing slots`);

    // Get the user's active templates
    const templates = await prisma.availabilityTemplate.findMany({
      where: { userId, isActive: true }
    });

    if (templates.length === 0) {
      console.log(`[callback:regenerateSlots] No templates found for user ${userId}`);
      return;
    }

    console.log(`[callback:regenerateSlots] Found ${templates.length} templates`);

    // Generate slots for the next 30 days
    const now = new Date();
    const slotsToCreate: any[] = [];

    for (let daysAhead = 0; daysAhead < 30; daysAhead++) {
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() + daysAhead);
      
      templates.forEach((template: any) => {
        if (targetDate.getDay() === template.dayOfWeek) {
          // Parse time strings (e.g., "09:00" and "17:00")
          const [startHour, startMin] = template.startTime.split(':').map(Number);
          const [endHour, endMin] = template.endTime.split(':').map(Number);
          
          // Create 30-minute slots between start and end time
          const startMinutes = startHour * 60 + startMin;
          const endMinutes = endHour * 60 + endMin;
          
          for (let currentMin = startMinutes; currentMin < endMinutes; currentMin += 30) {
            const slotStartTime = new Date(targetDate);
            slotStartTime.setHours(Math.floor(currentMin / 60), currentMin % 60, 0, 0);
            
            const slotEndTime = new Date(targetDate);
            slotEndTime.setHours(Math.floor((currentMin + 30) / 60), (currentMin + 30) % 60, 0, 0);
            
            slotsToCreate.push({
              userId,
              startTime: slotStartTime,
              endTime: slotEndTime,
              isBooked: false,
            });
          }
        }
      });
    }

    // Create new slots
    if (slotsToCreate.length > 0) {
      await prisma.availabilitySlot.createMany({
        data: slotsToCreate,
      });
      console.log(`[callback:regenerateSlots] Generated ${slotsToCreate.length} slots`);
    } else {
      console.log(`[callback:regenerateSlots] No slots to create (check template days match upcoming dates)`);
    }

  } catch (error) {
    console.error(`[callback:regenerateSlots] Error:`, error);
    // Don't throw - we don't want to fail the whole callback if slot generation fails
  }
}