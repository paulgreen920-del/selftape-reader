// app/reader/[id]/profile/page.tsx
import Link from 'next/link';
import { notFound } from "next/navigation";
import { prisma } from "../../../../lib/prisma";

export const dynamic = "force-dynamic";

type Params = { id: string };

export default async function ReaderProfilePage(
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
      email: true,
      headshotUrl: true,
      bio: true,
      timezone: true,
      gender: true,
      playableAgeMin: true,
      playableAgeMax: true,
      unions: true,
      languages: true,
      specialties: true,
      ratePer15Min: true,
      ratePer30Min: true,
      ratePer60Min: true,
      role: true,
      isActive: true,
      AvailabilitySlot: {
        where: {
          startTime: { gte: new Date() },
          isBooked: false,
        },
        take: 1,
      },
    },
  });

  if (!reader || (reader.role !== "READER" && reader.role !== "ADMIN")) notFound();

  const displayName = reader.displayName || reader.name || "Reader";
  const hasAvailability = reader.AvailabilitySlot.length > 0;

  // Helper to format cents to dollars
  function formatCents(cents: number): string {
    return `$${(cents / 100).toFixed(0)}`;
  }

  // Get initials for avatar fallback
  function getInitials(name: string): string {
    return name
      .split(" ")
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }

  return (
    <main className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Back Link */}
        <div className="mb-6">
          <Link href="/readers" className="text-blue-600 hover:underline text-sm">
            ← Browse All Readers
          </Link>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-8">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              {/* Headshot */}
              <div className="h-32 w-32 shrink-0 overflow-hidden rounded-2xl border-4 border-white shadow-lg bg-white">
                {reader.headshotUrl ? (
                  <img
                    src={reader.headshotUrl}
                    alt={displayName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full bg-gray-200 flex items-center justify-center text-3xl font-bold text-gray-500">
                    {getInitials(displayName)}
                  </div>
                )}
              </div>

              {/* Name & Quick Info */}
              <div className="text-center sm:text-left">
                <h1 className="text-3xl font-bold text-white mb-2">{displayName}</h1>
                {reader.gender && (
                  <p className="text-emerald-100 text-lg">{reader.gender}</p>
                )}
                {/* Status Badge */}
                <div className="mt-3">
                  {reader.isActive && hasAvailability ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-white/20 text-white">
                      <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                      Available for Booking
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-white/20 text-white">
                      <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
                      Limited Availability
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Body Section */}
          <div className="p-6 space-y-6">
            {/* Bio */}
            {reader.bio && (
              <section>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">About</h2>
                <p className="text-gray-700 leading-relaxed">{reader.bio}</p>
              </section>
            )}

            {/* Details Grid */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Details</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {/* Age Range */}
                {(reader.playableAgeMin || reader.playableAgeMax) && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="text-sm text-gray-500 mb-1">Playable Age Range</div>
                    <div className="font-semibold text-gray-900">
                      {reader.playableAgeMin && reader.playableAgeMax
                        ? `${reader.playableAgeMin} - ${reader.playableAgeMax} years`
                        : reader.playableAgeMin
                        ? `${reader.playableAgeMin}+ years`
                        : `Up to ${reader.playableAgeMax} years`}
                    </div>
                  </div>
                )}

                {/* Timezone */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="text-sm text-gray-500 mb-1">Timezone</div>
                  <div className="font-semibold text-gray-900">
                    {reader.timezone?.replace('_', ' ') || 'America/New York'}
                  </div>
                </div>

                {/* Union Status */}
                {reader.unions && Array.isArray(reader.unions) && reader.unions.length > 0 && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="text-sm text-gray-500 mb-2">Union Status</div>
                    <div className="flex flex-wrap gap-2">
                      {(reader.unions as string[]).map((union) => (
                        <span
                          key={union}
                          className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium"
                        >
                          {union}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Languages */}
                {reader.languages && Array.isArray(reader.languages) && reader.languages.length > 0 && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="text-sm text-gray-500 mb-2">Languages</div>
                    <div className="flex flex-wrap gap-2">
                      {(reader.languages as string[]).map((lang) => (
                        <span
                          key={lang}
                          className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium"
                        >
                          {lang}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Specialties */}
            {reader.specialties && Array.isArray(reader.specialties) && reader.specialties.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Specialties</h2>
                <div className="flex flex-wrap gap-2">
                  {(reader.specialties as string[]).map((spec) => (
                    <span
                      key={spec}
                      className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium"
                    >
                      {spec}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Session Rates */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Session Rates</h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <div className="text-sm text-gray-500 mb-1">15 min</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {formatCents(reader.ratePer15Min || 1500)}
                  </div>
                </div>
                <div className="bg-emerald-50 rounded-xl p-4 text-center border-2 border-emerald-200">
                  <div className="text-sm text-emerald-600 mb-1">30 min</div>
                  <div className="text-2xl font-bold text-emerald-700">
                    {formatCents(reader.ratePer30Min || 2500)}
                  </div>
                  <div className="text-xs text-emerald-600 mt-1">Most Popular</div>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <div className="text-sm text-gray-500 mb-1">60 min</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {formatCents(reader.ratePer60Min || 5000)}
                  </div>
                </div>
              </div>
            </section>

            {/* Book Button */}
            <div className="pt-4">
              <Link
                href={`/reader/${reader.id}`}
                className="block w-full text-center bg-emerald-600 text-white px-6 py-4 rounded-xl hover:bg-emerald-700 font-semibold text-lg transition shadow-lg shadow-emerald-200"
              >
                Book a Session with {displayName.split(' ')[0]}
              </Link>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Sessions are conducted via video call. You'll receive a meeting link after booking.</p>
        </div>
      </div>
    </main>
  );
}