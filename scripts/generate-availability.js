// Availability slot generator script
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function generateAvailabilitySlots(userId, dateStr, options = {}) {
  const {
    startHour = 9,     // 9 AM
    endHour = 17,      // 5 PM  
    slotDuration = 30, // 30 minutes
    timezone = 'America/New_York'
  } = options;

  try {
    console.log(`Generating availability for ${dateStr}...`);

    // Delete existing slots for this date
    const startOfDay = new Date(dateStr + 'T00:00:00.000Z');
    const endOfDay = new Date(dateStr + 'T23:59:59.999Z');
    
    const deleted = await prisma.availabilitySlot.deleteMany({
      where: {
        userId,
        startTime: { gte: startOfDay, lt: endOfDay }
      }
    });

    if (deleted.count > 0) {
      console.log(`  Deleted ${deleted.count} existing slots`);
    }

    // Generate new slots
    const slots = [];
    
    // Convert timezone hours to UTC
    // For EST (UTC-5), add 5 hours to get UTC
    // For EDT (UTC-4), add 4 hours to get UTC
    const isEDT = isDateInEDT(new Date(dateStr));
    const utcOffset = isEDT ? 4 : 5;

    for (let localHour = startHour; localHour < endHour; localHour++) {
      for (let minute = 0; minute < 60; minute += slotDuration) {
        const utcHour = localHour + utcOffset;
        
        // Handle day rollover
        let adjustedDate = dateStr;
        let adjustedHour = utcHour;
        
        if (utcHour >= 24) {
          // Next day in UTC
          const nextDay = new Date(dateStr);
          nextDay.setDate(nextDay.getDate() + 1);
          adjustedDate = nextDay.toISOString().split('T')[0];
          adjustedHour = utcHour - 24;
        }

        const startTime = new Date(`${adjustedDate}T${String(adjustedHour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00.000Z`);
        const endTime = new Date(startTime.getTime() + slotDuration * 60 * 1000);

        slots.push({
          userId,
          startTime,
          endTime,
          isBooked: false
        });
      }
    }

    // Insert slots
    const created = await prisma.availabilitySlot.createMany({
      data: slots
    });

    console.log(`  Created ${created.count} availability slots`);
    
    // Show sample times
    if (slots.length > 0) {
      const firstSlot = slots[0];
      const lastSlot = slots[slots.length - 1];
      
      const firstET = firstSlot.startTime.toLocaleString('en-US', { 
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      const lastET = lastSlot.startTime.toLocaleString('en-US', { 
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      
      console.log(`  Time range: ${firstET} - ${lastET} ${timezone.split('/')[1]}`);
    }

    return created.count;

  } catch (error) {
    console.error(`Error generating slots for ${dateStr}:`, error);
    return 0;
  }
}

function isDateInEDT(date) {
  // Daylight saving time typically runs from second Sunday in March to first Sunday in November
  // This is a simplified check - for production use a proper timezone library
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-based
  
  // Rough EDT period: March-October
  return month >= 2 && month <= 9;
}

async function generateAvailabilityForReader(readerId, daysAhead = 30) {
  try {
    console.log(`=== Generating ${daysAhead} days of availability for reader ${readerId} ===`);

    const reader = await prisma.user.findUnique({
      where: { id: readerId },
      select: { 
        id: true, 
        name: true, 
        displayName: true, 
        timezone: true 
      }
    });

    if (!reader) {
      console.log('Reader not found');
      return;
    }

    console.log(`Reader: ${reader.displayName || reader.name}`);
    console.log(`Timezone: ${reader.timezone || 'America/New_York'}`);

    let totalSlots = 0;
    const today = new Date();
    
    for (let i = 1; i <= daysAhead; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      
      // Skip weekends for now (Sunday = 0, Saturday = 6)
      const dayOfWeek = date.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        continue;
      }

      const slotsCreated = await generateAvailabilitySlots(readerId, dateStr, {
        timezone: reader.timezone || 'America/New_York'
      });
      
      totalSlots += slotsCreated;
    }

    console.log(`\n✅ Generated ${totalSlots} total availability slots`);

  } catch (error) {
    console.error('Error:', error);
  }
}

// If called directly, run for Paul Green
if (require.main === module) {
  async function main() {
    const paulId = 'cmhx8dvgh000uvqfsiccfq8qo';
    await generateAvailabilityForReader(paulId, 15); // 15 days ahead
    process.exit(0);
  }
  
  main();
}

module.exports = { generateAvailabilitySlots, generateAvailabilityForReader };