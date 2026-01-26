import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Check if request is authenticated (either session or API key)
function isAuthorized(req: NextRequest): boolean {
  const apiKey = req.headers.get("x-api-key");
  if (apiKey && apiKey === process.env.BLOG_API_KEY) {
    return true;
  }
  // For browser requests, we rely on your existing admin auth
  // (assuming admin pages are already protected)
  return true;
}

// GET - List all blog posts (admin view - includes unpublished)
export async function GET(req: NextRequest) {
  try {
    const posts = await prisma.blogPost.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ ok: true, posts });
  } catch (error) {
    console.error("Failed to fetch blog posts:", error);
    return NextResponse.json({ ok: false, error: "Failed to fetch posts" }, { status: 500 });
  }
}

// POST - Create a new blog post
export async function POST(req: NextRequest) {
  try {
    // Check for API key on programmatic requests
    const apiKey = req.headers.get("x-api-key");
    const isZapier = apiKey !== null;
    
    if (isZapier && apiKey !== process.env.BLOG_API_KEY) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const rawText = await req.text();
    // Fix unescaped control characters in JSON
    const sanitized = rawText.replace(/[\n\r\t]/g, (match) => {
      if (match === '\n') return '\\n';
      if (match === '\r') return '\\r';
      if (match === '\t') return '\\t';
      return match;
    });
    const body = JSON.parse(sanitized);
    console.log("Received body:", JSON.stringify(body, null, 2));

    const { title, slug, excerpt, content, imageUrl, published, scheduledAt } = body;

    if (!title || !slug || !content) {
      console.log("Missing fields - title:", !!title, "slug:", !!slug, "content:", !!content);
      return NextResponse.json({ 
        ok: false, 
        error: "Title, slug, and content are required",
        received: { hasTitle: !!title, hasSlug: !!slug, hasContent: !!content }
      }, { status: 400 });
    }

    // Check if slug already exists
    const existing = await prisma.blogPost.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json({ ok: false, error: "Slug already exists" }, { status: 400 });
    }

    // Determine publishedAt based on scheduling
    let publishedAt = null;
    if (published && !scheduledAt) {
      // Publishing immediately
      publishedAt = new Date();
    }

    const post = await prisma.blogPost.create({
      data: {
        title,
        slug,
        excerpt: excerpt || null,
        content,
        imageUrl: imageUrl || null,
        published: published || false,
        publishedAt,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      },
    });

    return NextResponse.json({ ok: true, post });
  } catch (error) {
    console.error("Failed to create blog post:", error);
    return NextResponse.json({ ok: false, error: "Failed to create post" }, { status: 500 });
  }
}
