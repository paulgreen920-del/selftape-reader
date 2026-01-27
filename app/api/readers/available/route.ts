import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Simple in-memory cache for raw database results
let cachedUsers: any[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Fisher-Yates shuffle for true randomization
function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * GET /api/readers/available
 * Returns all fully onboarded available readers, sorted by cohorts
 * Database results cached for 5 minutes, but shuffle is fresh each request
 */
export async function GET() {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    let users: any[];
    const cacheAge = Date.now() - cacheTimestamp;

    // Use cached data if valid, otherwise fetch fresh
    if (cachedUsers && cacheAge < CACHE_TTL_MS) {
      console.log('[Readers] Using cached data');
      users = cachedUsers;
    } else {
      console.log('[Readers] Cache miss - fetching from database');
      
      users = await prisma.user.findMany({
        where: { role: { in: ["READER", "ADMIN"] } },
        include: {
          CalendarConnection: true,
          AvailabilitySlot: {
            where: {
              startTime: { gte: now },
              isBooked: false,
            },
            orderBy: { startTime: "asc" },
            take: 20,
          },
          Booking_Booking_readerIdToUser: {
            where: {
              startTime: { gte: todayStart, lt: todayEnd },
              status: { in: ["PENDING", "CONFIRMED"] },
            },
          },
        },
      });

      // Update cache
      cachedUsers = users;
      cacheTimestamp = Date.now();
    }

    // Filter to only fully onboarded readers (runs every request, uses cached data)
    const fullyOnboarded = users.filter(user => {
      return (
        (user.role === "READER" || user.isAdmin === true) &&
        user.displayName != null &&
        user.headshotUrl != null &&
        user.ratePer15Min != null &&
        user.ratePer30Min != null &&
        user.ratePer60Min != null &&
        user.stripeAccountId != null &&
        user.isActive === true &&
        user.AvailabilitySlot && user.AvailabilitySlot.length > 0 &&
        user.CalendarConnection != null
      );
    });

    // Add metadata for sorting (runs every request)
    const readersWithMeta = fullyOnboarded.map((r) => {
      const bookingsToday = r.Booking_Booking_readerIdToUser?.length || 0;
      const soonestSlot = r.AvailabilitySlot[0]?.startTime || null;
      const hasAvailabilityToday = r.AvailabilitySlot.some(
        (slot: { startTime: Date }) => slot.startTime >= now && slot.startTime < todayEnd
      );

      return {
        ...r,
        bookingsToday,
        soonestSlot,
        hasAvailabilityToday,
      };
    });

    type ReaderWithMeta = (typeof readersWithMeta)[0];

    // Separate into cohorts
    const availableToday = readersWithMeta.filter((r) => r.hasAvailabilityToday);
    const availableFuture = readersWithMeta.filter(
      (r) => !r.hasAvailabilityToday && r.soonestSlot
    );
    const noAvailability = readersWithMeta.filter((r) => !r.soonestSlot);

    // Group by bookings count and shuffle within each group
    function groupAndShuffle(readers: ReaderWithMeta[]): ReaderWithMeta[] {
      const grouped: { [key: number]: ReaderWithMeta[] } = {};

      readers.forEach((r) => {
        if (!grouped[r.bookingsToday]) {
          grouped[r.bookingsToday] = [];
        }
        grouped[r.bookingsToday].push(r);
      });

      const sortedKeys = Object.keys(grouped)
        .map(Number)
        .sort((a, b) => a - b);

      const result: ReaderWithMeta[] = [];
      sortedKeys.forEach((key) => {
        result.push(...shuffle(grouped[key]));
      });

      return result;
    }

    // Final sorted order (shuffled fresh each request)
    const sortedReaders = [
      ...groupAndShuffle(availableToday),
      ...groupAndShuffle(availableFuture),
      ...shuffle(noAvailability),
    ];

    // Remove relations from output
    const output = sortedReaders.map(({ 
      CalendarConnection, 
      AvailabilitySlot, 
      Booking_Booking_readerIdToUser,
      bookingsToday,
      soonestSlot,
      hasAvailabilityToday,
      ...rest 
    }) => ({
      ...rest,
      availabilitySlotCount: AvailabilitySlot.length,
    }));

    return NextResponse.json({ ok: true, readers: output }, { status: 200 });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Server error";
    console.error("[GET /api/readers/available] error:", err);
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}

/**
 * POST /api/readers/available
 * Invalidate cache (call when a reader updates their profile or completes setup)
 */
export async function POST() {
  cachedUsers = null;
  cacheTimestamp = 0;
  console.log('[Readers] Cache invalidated');
  return NextResponse.json({ ok: true, message: "Cache invalidated" });
}