import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET - List all blog posts (admin view - includes unpublished)
export async function GET(req: NextRequest) {
  // Check for API key
  const apiKey = req.headers.get('x-api-key');
  if (apiKey !== process.env.BLOG_API_KEY) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
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
  // Check for API key
  const apiKey = req.headers.get('x-api-key');
  if (apiKey !== process.env.BLOG_API_KEY) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { title, slug, excerpt, content, imageUrl, published, scheduledAt } = body;

    if (!title || !slug || !content) {
      return NextResponse.json({ ok: false, error: "Title, slug, and content are required" }, { status: 400 });
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
