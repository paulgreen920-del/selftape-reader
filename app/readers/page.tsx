
import ReadersGrid from "./ReadersGrid";
import { headers } from "next/headers";

export const metadata = {
  title: "Find a Self Tape Reader | Book an Actor to Read Lines With You",
  description: "Browse available readers for your self-tape audition. Book a real actor to read lines with you over video chat. Instant availability, no subscription required.",
  keywords: ["find self tape reader", "book audition reader", "actor reader for hire", "self tape help"],
  openGraph: {
    title: "Find a Self Tape Reader | Book Instantly",
    description: "Browse available readers for your self-tape audition. Book a real actor to read lines with you.",
    url: "https://www.selftapereader.com/readers",
  },
};

export default async function ReadersPage() {
  // Get absolute URL for API route in server component
  const headersList = await headers();
  const host = headersList.get("host");
  const protocol = process.env.NODE_ENV === "development" ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;
  const res = await fetch(`${baseUrl}/api/readers/available`, { cache: 'no-store' });
  const data = await res.json();
  const readers = data.readers || [];

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
        readers={readers}
        currentFilters={{}}
      />
    </main>
  );
}
