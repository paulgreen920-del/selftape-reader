
import ReadersGrid from "./ReadersGrid";
import { headers } from "next/headers";


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
