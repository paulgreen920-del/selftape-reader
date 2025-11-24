// app/api/calendar/ical/connect/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import ICAL from "ical.js";

export async function POST(req: Request) {
  try {
    const { readerId, icalUrl } = await req.json();

    if (!readerId || !icalUrl) {
      return NextResponse.json(
        { ok: false, error: "Missing readerId or icalUrl" },
        { status: 400 }
      );
    }

    // Validate URL format
    const urlPattern = /^(https?|webcal):\/\/.+/i;
    if (!urlPattern.test(icalUrl)) {
      return NextResponse.json(
        { ok: false, error: "Invalid URL format. Must start with http://, https://, or webcal://" },
        { status: 400 }
      );
    }

    // Convert webcal:// to https://
    const fetchUrl = icalUrl.replace(/^webcal:\/\//i, "https://");

    // Test the iCal URL by fetching and parsing it
    console.log('[iCal] Testing iCal URL:', fetchUrl);
    
    let icalData: string;
    try {
      const response = await fetch(fetchUrl, {
        headers: {
          'User-Agent': 'Self-Tape-Reader/1.0',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch iCal feed (HTTP ${response.status})`);
      }

      icalData = await response.text();
      
      if (!icalData || icalData.trim().length === 0) {
        throw new Error('iCal feed returned empty data');
      }

      // Validate it's actually iCal format
      if (!icalData.includes('BEGIN:VCALENDAR')) {
        throw new Error('Invalid iCal format - missing VCALENDAR');
      }

    } catch (fetchError: any) {
      console.error('[iCal] Failed to fetch iCal URL:', fetchError);
      return NextResponse.json(
        { 
          ok: false, 
          error: `Could not access iCal feed: ${fetchError.message}. Make sure the URL is public and accessible.` 
        },
        { status: 400 }
      );
    }

    // Try to parse the iCal data
    try {
      const jcalData = ICAL.parse(icalData);
      const comp = new ICAL.Component(jcalData);
      const vevents = comp.getAllSubcomponents('vevent');
      
      console.log(`[iCal] Successfully parsed iCal feed with ${vevents.length} events`);
    } catch (parseError: any) {
      console.error('[iCal] Failed to parse iCal data:', parseError);
      return NextResponse.json(
        { 
          ok: false, 
          error: `Invalid iCal format: ${parseError.message}` 
        },
        { status: 400 }
      );
    }

    // Verify reader exists
    const reader = await prisma.user.findUnique({
      where: { id: readerId },
      select: { id: true, email: true }
    });

    if (!reader) {
      return NextResponse.json(
        { ok: false, error: "Reader not found" },
        { status: 404 }
      );
    }

    // Delete any existing calendar connections for this user
    await prisma.calendarConnection.deleteMany({
      where: { userId: readerId }
    });

    // Create new iCal connection
    await prisma.calendarConnection.create({
      data: {
        id: `ical_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
        userId: readerId,
        provider: "ICAL",
        accessToken: fetchUrl, // Store the processed URL in accessToken field
        refreshToken: "",
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    });

    console.log(`[iCal] Successfully connected iCal calendar for reader ${readerId}`);

    // ⭐ REGENERATE AVAILABILITY SLOTS FROM TEMPLATES ⭐
    console.log("[iCal] Regenerating availability slots for user:", readerId);
    await regenerateAvailabilitySlots(readerId);

    return NextResponse.json({ 
      ok: true, 
      message: "iCal calendar connected successfully" 
    });

  } catch (error: any) {
    console.error('[iCal] Error connecting iCal calendar:', error);
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to connect iCal calendar" },
      { status: 500 }
    );
  }
}

// Regenerate availability slots from templates
async function regenerateAvailabilitySlots(userId: string) {
  console.log(`[iCal:regenerateSlots] Starting regeneration for user ${userId}`);
  
  try {
    // Delete existing slots for this user (they were tied to old calendar)
    const deleteResult = await prisma.availabilitySlot.deleteMany({
      where: { userId }
    });
    console.log(`[iCal:regenerateSlots] Deleted ${deleteResult.count} existing slots`);

    // Get the user's active templates
    const templates = await prisma.availabilityTemplate.findMany({
      where: { userId, isActive: true }
    });

    if (templates.length === 0) {
      console.log(`[iCal:regenerateSlots] No templates found for user ${userId}`);
      return;
    }

    console.log(`[iCal:regenerateSlots] Found ${templates.length} templates`);

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
      console.log(`[iCal:regenerateSlots] Generated ${slotsToCreate.length} slots`);
    } else {
      console.log(`[iCal:regenerateSlots] No slots to create (check template days match upcoming dates)`);
    }

  } catch (error) {
    console.error(`[iCal:regenerateSlots] Error:`, error);
    // Don't throw - we don't want to fail the whole connection if slot generation fails
  }
}