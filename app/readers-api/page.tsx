// app/readers/page.tsx
import { prisma } from "../../lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

function formatCents(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export default async function ReadersPage() {
  const readers = await prisma.user.findMany({
    where: { 
      role: { in: ["READER", "ADMIN"] },
      isActive: true 
    },
    include: { 
      AvailabilitySlot: {
        where: {
          startTime: { gte: new Date() } // Only future slots
        },
        take: 10 // Limit for performance
      }
    },
    orderBy: { displayName: "asc" },
  });

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Readers</h1>
        <p className="mt-2 text-muted-foreground">
          Browse available readers, filter by rate and availability, and book
          the reader that fits your session.
        </p>
      </header>

      {readers.length === 0 ? (
        <div className="rounded-lg border p-6 text-center">
          <p className="text-lg">No readers yet.</p>
          <p className="text-sm text-muted-foreground">
            Add a reader in your admin/onboarding flow to see them here.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {readers.map((r: any) => (
            <li
              key={r.id}
              className="group rounded-2xl border p-5 shadow-sm transition hover:shadow-md"
            >
              <div className="flex items-start gap-4">
                {/* Headshot (fallback to initials) */}
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border bg-muted grid place-items-center text-lg font-semibold">
                  {r.headshotUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={r.headshotUrl}
                      alt={r.displayName || r.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    (r.displayName || r.name)
                      .split(" ")
                      .map((p: string) => p[0])
                      .join("")
                      .slice(0, 2)
                  )}
                </div>

                <div className="min-w-0">
                  <h2 className="truncate text-xl font-semibold">
                    {r.displayName || r.name}
                  </h2>
                  <p className="truncate text-sm text-muted-foreground">
                    {r.email}
                  </p>
                </div>
              </div>

              {r.bio ? (
                <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">
                  {r.bio}
                </p>
              ) : null}

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-muted/60 p-3">
                  <div className="text-xs text-muted-foreground">Timezone</div>
                  <div className="font-medium">{r.timezone || "EST"}</div>
                </div>
                <div className="rounded-xl bg-muted/60 p-3">
                  <div className="text-xs text-muted-foreground">Slots</div>
                  <div className="font-medium">{r.AvailabilitySlot.length}+</div>
                </div>
              </div>

              <div className="mt-4 rounded-xl border p-3">
                <div className="text-xs text-muted-foreground mb-1">Rates</div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  <span className="font-medium">
                    15m: {formatCents(r.ratePer15Min || 1500)}
                  </span>
                  <span className="font-medium">
                    30m: {formatCents(r.ratePer30Min || 2500)}
                  </span>
                  <span className="font-medium">
                    60m: {formatCents(r.ratePer60Min || 6000)}
                  </span>
                </div>
              </div>

              <div className="mt-5">
                <Link
                  href={`/reader/${r.id}`}
                  className="inline-flex w-full items-center justify-center rounded-xl border bg-foreground px-4 py-2 text-background transition hover:opacity-90"
                >
                  Book {r.displayName || r.name}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
