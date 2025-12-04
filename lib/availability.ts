import { prisma } from './prisma';
import ical from 'ical'; // You may need to install 'ical' or use a similar parser

export async function getUserBusyTimes(userId: string): Promise<Array<{ start: Date; end: Date }>> {
  // Fetch all iCal connections for the user
  const connections = await prisma.ICalConnection.findMany({ where: { userId } });
  const allBusyTimes: Array<{ start: Date; end: Date }> = [];

  for (const connection of connections) {
    try {
      const res = await fetch(connection.url);
      if (!res.ok) continue;
      const icalText = await res.text();
      const data = ical.parseICS(icalText);
      for (const k in data) {
        const event = data[k];
        if (event.type === 'VEVENT' && event.start && event.end && event.status !== 'CANCELLED') {
          allBusyTimes.push({ start: new Date(event.start), end: new Date(event.end) });
        }
      }
    } catch (err) {
      // Ignore errors for individual feeds
      console.error(`[availability] Failed to fetch/parse iCal: ${connection.url}`, err);
    }
  }
  return allBusyTimes;
}

export function isSlotAvailable(slotStart: Date, slotEnd: Date, busyTimes: Array<{ start: Date; end: Date }>): boolean {
  return !busyTimes.some(busy =>
    (slotStart < busy.end && slotEnd > busy.start)
  );
}
