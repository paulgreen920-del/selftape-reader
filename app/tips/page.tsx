import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Self Tape Tips | Advice for Actors",
  description: "Practical tips and advice for actors on self-taping auditions. Learn how to find readers, improve your setup, and book more roles.",
  openGraph: {
    title: "Self Tape Tips | Advice for Actors",
    description: "Practical tips and advice for actors on self-taping auditions.",
    url: "https://www.selftapereader.com/tips",
  },
};

export const dynamic = "force-dynamic";

export default async function TipsPage() {
  const posts = await prisma.blogPost.findMany({
    where: { published: true },
    orderBy: { publishedAt: "desc" },
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      imageUrl: true,
      publishedAt: true,
    },
  });

  return (
    <main className="max-w-4xl mx-auto px-6 py-12">
      <header className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight">Self Tape Tips</h1>
        <p className="mt-2 text-gray-600">
          Practical advice to help you nail your self-tape auditions.
        </p>
      </header>

      {posts.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No tips published yet. Check back soon!
        </div>
      ) : (
        <div className="space-y-8">
          {posts.map((post) => (
            <article
              key={post.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition"
            >
              <Link href={`/tips/${post.slug}`} className="block">
                {post.imageUrl && (
                  <div className="aspect-[3/1] overflow-hidden">
                    <img
                      src={post.imageUrl}
                      alt={post.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="p-6">
                  <h2 className="text-xl font-semibold text-gray-900 hover:text-emerald-600 transition">
                    {post.title}
                  </h2>
                  {post.excerpt && (
                    <p className="mt-2 text-gray-600">{post.excerpt}</p>
                  )}
                  <p className="mt-4 text-sm text-gray-400">
                    {post.publishedAt
                      ? new Date(post.publishedAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                      : ""}
                  </p>
                </div>
              </Link>
            </article>
          ))}
        </div>
      )}

      {/* CTA */}
      <div className="mt-12 bg-emerald-50 rounded-xl p-8 text-center">
        <h2 className="text-xl font-semibold text-gray-900">Need a reader for your audition?</h2>
        <p className="mt-2 text-gray-600">
          Book a real actor to read with you. No subscription required.
        </p>
        <Link
          href="/readers"
          className="inline-block mt-4 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
        >
          Find a Reader
        </Link>
      </div>
    </main>
  );
}
