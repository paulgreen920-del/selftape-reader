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

  // Simple markdown-ish rendering
  const paragraphs = post.content.split(/\n\n+/);

  return (
    <main className="max-w-3xl mx-auto px-6 py-12">
      {/* Back link */}
      <div className="mb-8">
        <Link href="/tips" className="text-emerald-600 hover:underline text-sm inline-flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          All Self Tape Tips
        </Link>
      </div>

      {/* Article */}
      <article>
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 leading-tight">
            {post.title}
          </h1>
          <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
            {post.publishedAt && (
              <time>
                {new Date(post.publishedAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </time>
            )}
            <span className="inline-flex items-center gap-1 text-emerald-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              5 min read
            </span>
          </div>
        </header>

        {/* Excerpt callout box */}
        {post.excerpt && (
          <div className="mb-8 p-6 bg-gradient-to-r from-emerald-50 to-teal-50 border-l-4 border-emerald-500 rounded-r-xl">
            <p className="text-lg text-gray-700 italic leading-relaxed">
              {post.excerpt}
            </p>
          </div>
        )}

        {/* Featured image */}
        {post.imageUrl && (
          <figure className="mb-10 -mx-6 sm:mx-0">
            <div className="rounded-xl overflow-hidden shadow-lg">
              <img
                src={post.imageUrl}
                alt={post.title}
                className="w-full h-auto"
              />
            </div>
          </figure>
        )}

        {/* Content */}
        <div className="prose-custom">
          {paragraphs.map((paragraph, index) => {
            const trimmed = paragraph.trim();
            if (!trimmed) return null;

            // Handle headings (## Heading)
            if (trimmed.startsWith('## ')) {
              return (
                <h2 key={index} className="text-2xl font-bold mt-12 mb-4 text-gray-900 border-b pb-2 border-gray-100">
                  {trimmed.replace('## ', '')}
                </h2>
              );
            }
            if (trimmed.startsWith('### ')) {
              return (
                <h3 key={index} className="text-xl font-semibold mt-8 mb-3 text-gray-900">
                  {trimmed.replace('### ', '')}
                </h3>
              );
            }

            // Handle pull quotes (lines starting with >)
            if (trimmed.startsWith('> ')) {
              return (
                <blockquote key={index} className="my-8 px-6 py-4 bg-gray-50 border-l-4 border-emerald-400 rounded-r-lg">
                  <p className="text-xl text-gray-700 font-medium italic">
                    {trimmed.replace('> ', '')}
                  </p>
                </blockquote>
              );
            }

            // Handle bullet lists
            if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
              const items = trimmed.split('\n').filter(line => line.trim());
              return (
                <ul key={index} className="my-6 space-y-3">
                  {items.map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-gray-700">
                      <span className="mt-1.5 h-2 w-2 bg-emerald-500 rounded-full flex-shrink-0"></span>
                      <span className="leading-relaxed">{item.replace(/^[-*]\s*/, '')}</span>
                    </li>
                  ))}
                </ul>
              );
            }

            // Handle numbered lists
            if (/^\d+\.\s/.test(trimmed)) {
              const items = trimmed.split('\n').filter(line => line.trim());
              return (
                <ol key={index} className="my-6 space-y-3 counter-reset-item">
                  {items.map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-gray-700">
                      <span className="flex-shrink-0 w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium flex items-center justify-center">
                        {i + 1}
                      </span>
                      <span className="leading-relaxed">{item.replace(/^\d+\.\s*/, '')}</span>
                    </li>
                  ))}
                </ol>
              );
            }

            // Regular paragraph
            return (
              <p key={index} className="text-gray-700 leading-relaxed mb-6 text-lg">
                {trimmed}
              </p>
            );
          })}
        </div>
      </article>

      {/* Share / engagement section */}
      <div className="mt-12 pt-8 border-t border-gray-200">
        <p className="text-center text-gray-500 text-sm">
          Found this helpful? Share it with a fellow actor!
        </p>
      </div>

      {/* CTA */}
      <div className="mt-8 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-8 text-center text-white shadow-xl">
        <h2 className="text-2xl font-bold">
          Ready to put these tips into practice?
        </h2>
        <p className="mt-2 text-emerald-100">
          Book a reader for your next self-tape audition. No subscription required.
        </p>
        <Link
          href="/readers"
          className="inline-block mt-6 px-8 py-4 bg-white text-emerald-700 rounded-xl hover:bg-gray-100 transition font-semibold shadow-lg"
        >
          Find a Reader Now
        </Link>
      </div>

      {/* Back to tips */}
      <div className="mt-8 text-center">
        <Link href="/tips" className="text-emerald-600 hover:underline inline-flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to all tips
        </Link>
      </div>
    </main>
  );
}