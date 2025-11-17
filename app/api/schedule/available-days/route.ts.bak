import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const readerId = searchParams.get("readerId");
    const duration = parseInt(searchParams.get("duration") || "30");

    if (!readerId) {
      return NextResponse.json({ ok: false, error: "Missing readerId" }, { status: 400 });
    }

    // Get reader with availability
    const reader = await prisma.reader.findUnique({
      where: { id: readerId },
      include: { availability: true },
    });

    if (!reader) {
      return NextResponse.json({ ok: false, error: "Reader not found" }, { status: 404 });
    }

    // Calculate date range (today through maxAdvanceBooking hours)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const maxDate = new Date(today);
    maxDate.setTime(maxDate.getTime() + reader.maxAdvanceBooking * 60 * 60 * 1000);
    
    console.log('[available-days] today:', today);
    console.log('[available-days] maxDate:', maxDate);
    console.log('[available-days] reader.maxAdvanceBooking hours:', reader.maxAdvanceBooking);

    // Get all days within range
    const availableDays: string[] = [];
    const currentDate = new Date(today);

    while (currentDate <= maxDate) {
      const dayOfWeek = currentDate.getDay();
      
      // Check if reader has availability for this day of week
      const hasAvailability = reader.availability.some(slot => slot.dayOfWeek === dayOfWeek);
      
      if (hasAvailability) {
        const dateStr = currentDate.toISOString().split('T')[0];
        
        // Quick check: does this day have any future slots?
        // We'll do a simplified check - just see if there are slots and it's not fully booked
        const dayAvailability = reader.availability.filter(slot => slot.dayOfWeek === dayOfWeek);
        
        // Check if day has existing bookings that would block all slots
        const startOfDay = new Date(dateStr + 'T00:00:00');
        const endOfDay = new Date(dateStr + 'T23:59:59');
        
        const bookings = await prisma.booking.findMany({
          where: {
            readerId,
            startTime: { gte: startOfDay, lte: endOfDay },
            status: { in: ["PENDING", "PAID"] },
          },
          select: { startTime: true, endTime: true },
        });

        // Generate slots and check if any are available
        let hasAvailableSlot = false;
        const now = new Date();

        for (const avail of dayAvailability) {
          let currentMin = avail.startMin;
          
          while (currentMin + duration <= avail.endMin) {
            const slotStart = currentMin;
            const slotEnd = currentMin + duration;
            
            // Build slot time
            const slotStartTime = new Date(`${dateStr}T${String(Math.floor(slotStart / 60)).padStart(2, '0')}:${String(slotStart % 60).padStart(2, '0')}:00`);
            const slotEndTime = new Date(`${dateStr}T${String(Math.floor(slotEnd / 60)).padStart(2, '0')}:${String(slotEnd % 60).padStart(2, '0')}:00`);
            
            // Check if slot meets minimum advance booking requirement
            const minBookingTime = new Date(now.getTime() + reader.minAdvanceHours * 60 * 60 * 1000);
            if (slotStartTime <= minBookingTime) {
              currentMin += duration;
              continue;
            }
            
            // Check if slot conflicts with existing booking
            const hasConflict = bookings.some(booking => 
              slotStartTime < booking.endTime && slotEndTime > booking.startTime
            );
            
            if (!hasConflict) {
              hasAvailableSlot = true;
              break;
            }
            
            currentMin += duration;
          }
          
          if (hasAvailableSlot) break;
        }
        
        // DEBUG: Log Nov 25 specifically
        if (dateStr === '2025-11-25') {
          console.log('[available-days] Nov 25 - hasAvailableSlot:', hasAvailableSlot);
          console.log('[available-days] Nov 25 - now:', now);
          console.log('[available-days] Nov 25 - minBookingTime:', new Date(now.getTime() + reader.minAdvanceHours * 60 * 60 * 1000));
          console.log('[available-days] Nov 25 - dayAvailability:', dayAvailability);
        }
        
        if (hasAvailableSlot) {
          availableDays.push(dateStr);
        }
      }
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return NextResponse.json({ ok: true, availableDays });
  } catch (err: any) {
    console.error("[available-days] Error:", err);
    return NextResponse.json({ ok: false, error: err.message || "Failed to get available days" }, { status: 500 });
  }
}