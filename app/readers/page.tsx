import { prisma } from "../../lib/prisma";
import ReadersGrid from "./ReadersGrid";

function formatCents(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export const dynamic = "force-dynamic";

type SearchParams = {
  gender?: string;
  ageMin?: string;
  ageMax?: string;
  union?: string;
  language?: string;
  specialty?: string;
};

// Fisher-Yates shuffle for true randomization
function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default async function ReadersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  // Build where clause based on filters
  // Only show readers who have completed onboarding
  const where: any = {
    role: { in: ["READER", "ADMIN"] },
    isActive: true,
    onboardingStep: null, // Only fully onboarded readers
    subscriptionStatus: "active", // Must have active subscription
    stripeAccountId: { not: null }, // Must have Stripe connected
  };

  if (params.gender && params.gender !== "all") {
    where.gender = params.gender;
  }

  if (params.ageMin || params.ageMax) {
    where.AND = [];
    if (params.ageMin) {
      where.AND.push({
        playableAgeMax: { gte: parseInt(params.ageMin) },
      });
    }
    if (params.ageMax) {
      where.AND.push({
        playableAgeMin: { lte: parseInt(params.ageMax) },
      });
    }
  }

  if (params.union && params.union !== "all") {
    where.unions = { has: params.union };
  }

  if (params.language && params.language !== "all") {
    where.languages = { has: params.language };
  }

  if (params.specialty && params.specialty !== "all") {
    where.specialties = { has: params.specialty };
  }

  // Get today's date boundaries
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  // Fetch all readers with their availability and today's bookings
  const readers = await prisma.user.findMany({
    where,
    include: {
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

  // Categorize readers into cohorts
  type ReaderWithMeta = (typeof readers)[0] & {
    bookingsToday: number;
    soonestSlot: Date | null;
    hasAvailabilityToday: boolean;
  };

  const readersWithMeta: ReaderWithMeta[] = readers.map((r: any) => {
    const bookingsToday = r.bookingsAsReader?.length || 0;
    const soonestSlot = r.availabilitySlots?.[0]?.startTime || null;
    const hasAvailabilityToday = r.availabilitySlots?.some(
      (slot: any) => slot.startTime >= now && slot.startTime < todayEnd
    ) || false;

    return {
      ...r,
      bookingsToday,
      soonestSlot,
      hasAvailabilityToday,
    };
  });

  // Sort into cohorts:
  // 1. Available today, sorted by bookings (fewer = higher), then randomized within each booking count
  // 2. Available future, sorted by bookings, then randomized
  // 3. No availability

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

    // Sort by booking count (ascending) and shuffle within each group
    const sortedKeys = Object.keys(grouped)
      .map(Number)
      .sort((a, b) => a - b);

    const result: ReaderWithMeta[] = [];
    sortedKeys.forEach((key) => {
      result.push(...shuffle(grouped[key]));
    });

    return result;
  }

  const sortedReaders = [
    ...groupAndShuffle(availableToday),
    ...groupAndShuffle(availableFuture),
    ...shuffle(noAvailability),
  ];

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Find Readers</h1>
        <p className="mt-2 text-muted-foreground">
          Browse available readers, filter by your needs, and book the perfect
          reader for your session.
        </p>
      </header>

      <ReadersGrid
        readers={sortedReaders as any}
        currentFilters={params}
      />
    </main>
  );
}