// app/reader/[id]/page.tsx
import CalendarBooking from './CalendarBooking';
import { notFound } from "next/navigation";
import { prisma } from "../../../lib/prisma";

// In dev, force dynamic so this page isn't statically preresolved
export const dynamic = "force-dynamic";

type Params = { id: string };

// Accept params as either a value or a Promise (Next 16 behavior)
export default async function ReaderDetailPage(
  props: { params: Params } | { params: Promise<Params> }
) {
  const raw = (props as any).params;
  const resolved: Params = typeof raw?.then === "function" ? await raw : raw;

  const id = Array.isArray(resolved?.id) ? resolved.id[0] : resolved?.id;
  if (!id) notFound();

  const reader = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      displayName: true,
      headshotUrl: true,
      ratePer15Min: true,
      ratePer30Min: true,
      ratePer60Min: true,
      role: true,
      maxAdvanceBooking: true,
      AvailabilitySlot: { 
        orderBy: [{ startTime: "asc" }],
        where: {
          startTime: { gte: new Date() } // Only show future slots
        },
        take: 50 // Limit to next 50 slots
      },
    },
  });

  if (!reader || (reader.role !== "READER" && reader.role !== "ADMIN")) notFound();

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <CalendarBooking reader={reader} availability={reader.AvailabilitySlot} />
    </main>
  );
}