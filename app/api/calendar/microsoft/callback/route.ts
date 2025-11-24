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
    const returnTo = parsed.returnTo || "onboarding"; // Track where user came from
    
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

    // Delete existing calendar connection for this user (any provider)
    await prisma.calendarConnection.deleteMany({
      where: { userId: readerId }
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

    // ⭐ REGENERATE AVAILABILITY SLOTS FROM TEMPLATES ⭐
    console.log("[MS Callback] Regenerating availability slots for user:", readerId);
    await regenerateAvailabilitySlots(readerId);

    // Determine redirect URL based on where user came from
    let redirectUrl: string;
    if (returnTo === "dashboard") {
      // User was in dashboard - return to manage availability
      redirectUrl = `/reader/availability?connected=microsoft`;
    } else {
      // User was in onboarding - continue to schedule step
      redirectUrl = `/onboarding/schedule?readerId=${encodeURIComponent(readerId)}&connected=microsoft`;
    }

    console.log("[MS Callback] Redirecting to:", redirectUrl, "(returnTo was:", returnTo, ")");

    return NextResponse.redirect(new URL(redirectUrl, process.env.NEXT_PUBLIC_URL || req.url));
  } catch (e: any) {
    console.error("[MS Callback] Error:", e);
    return NextResponse.redirect(new URL('/onboarding/schedule?error=unknown', req.url));
  }
}

// Regenerate availability slots from templates
async function regenerateAvailabilitySlots(userId: string) {
  console.log(`[MS Callback:regenerateSlots] Starting regeneration for user ${userId}`);
  
  try {
    // Delete existing slots for this user (they were tied to old calendar)
    const deleteResult = await prisma.availabilitySlot.deleteMany({
      where: { userId }
    });
    console.log(`[MS Callback:regenerateSlots] Deleted ${deleteResult.count} existing slots`);

    // Get the user's active templates
    const templates = await prisma.availabilityTemplate.findMany({
      where: { userId, isActive: true }
    });

    if (templates.length === 0) {
      console.log(`[MS Callback:regenerateSlots] No templates found for user ${userId}`);
      return;
    }

    console.log(`[MS Callback:regenerateSlots] Found ${templates.length} templates`);

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
      console.log(`[MS Callback:regenerateSlots] Generated ${slotsToCreate.length} slots`);
    } else {
      console.log(`[MS Callback:regenerateSlots] No slots to create (check template days match upcoming dates)`);
    }

  } catch (error) {
    console.error(`[MS Callback:regenerateSlots] Error:`, error);
    // Don't throw - we don't want to fail the whole callback if slot generation fails
  }
}