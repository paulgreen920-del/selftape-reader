import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Metadata } from "next";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;

  const post = await prisma.blogPost.findUnique({
    where: { slug },
    select: { title: true, excerpt: true, imageUrl: true },
  });

  if (!post) {
    return { title: "Tip Not Found | Self Tape Reader" };
  }

  return {
    title: `${post.title} | Self Tape Tips`,
    description: post.excerpt || `Read "${post.title}" on Self Tape Reader.`,
    openGraph: {
      title: post.title,
      description: post.excerpt || undefined,
      url: `https://www.selftapereader.com/tips/${slug}`,
      images: post.imageUrl ? [{ url: post.imageUrl }] : undefined,
    },
  };
}

export default async function TipPage({ params }: Params) {
  const { slug } = await params;

  const post = await prisma.blogPost.findUnique({
    where: { slug },
  });

  if (!post || !post.published) {
    notFound();
  }

  // Simple markdown-ish rendering: split by double newlines for paragraphs
  const paragraphs = post.content.split(/\n\n+/);

  return (
    <main className="max-w-3xl mx-auto px-6 py-12">
      {/* Back link */}
      <div className="mb-8">
        <Link href="/tips" className="text-emerald-600 hover:underline text-sm">
          ← All Self Tape Tips
        </Link>
      </div>

      {/* Article */}
      <article>
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            {post.title}
          </h1>
          {post.publishedAt && (
            <p className="mt-2 text-sm text-gray-500">
              {new Date(post.publishedAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          )}
        </header>

        {/* Featured image */}
        {post.imageUrl && (
          <div className="mb-8 rounded-xl overflow-hidden">
            <img
              src={post.imageUrl}
              alt={post.title}
              className="w-full h-auto"
            />
          </div>
        )}

        {/* Content */}
        <div className="prose prose-lg max-w-none">
          {paragraphs.map((paragraph, index) => {
            const trimmed = paragraph.trim();
            if (!trimmed) return null;

            // Handle headings (## Heading)
            if (trimmed.startsWith('## ')) {
              return (
                <h2 key={index} className="text-2xl font-bold mt-8 mb-4 text-gray-900">
                  {trimmed.replace('## ', '')}
                </h2>
              );
            }
            if (trimmed.startsWith('### ')) {
              return (
                <h3 key={index} className="text-xl font-semibold mt-6 mb-3 text-gray-900">
                  {trimmed.replace('### ', '')}
                </h3>
              );
            }

            // Handle bullet lists
            if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
              const items = trimmed.split('\n').filter(line => line.trim());
              return (
                <ul key={index} className="list-disc list-inside space-y-2 my-4 text-gray-700">
                  {items.map((item, i) => (
                    <li key={i}>{item.replace(/^[-*]\s*/, '')}</li>
                  ))}
                </ul>
              );
            }

            // Regular paragraph
            return (
              <p key={index} className="text-gray-700 leading-relaxed mb-4">
                {trimmed}
              </p>
            );
          })}
        </div>
      </article>

      {/* CTA */}
      <div className="mt-12 bg-emerald-50 rounded-xl p-8 text-center">
        <h2 className="text-xl font-semibold text-gray-900">
          Ready to put these tips into practice?
        </h2>
        <p className="mt-2 text-gray-600">
          Book a reader for your next self-tape audition.
        </p>
        <Link
          href="/readers"
          className="inline-block mt-4 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
        >
          Find a Reader
        </Link>
      </div>

      {/* Back to tips */}
      <div className="mt-8 text-center">
        <Link href="/tips" className="text-emerald-600 hover:underline">
          ← Back to all tips
        </Link>
      </div>
    </main>
  );
}
