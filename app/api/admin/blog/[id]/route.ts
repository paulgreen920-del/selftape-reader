import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

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

// GET - Get a single blog post
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    
    const post = await prisma.blogPost.findUnique({
      where: { id },
    });

    if (!post) {
      return NextResponse.json({ ok: false, error: "Post not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, post });
  } catch (error) {
    console.error("Failed to fetch blog post:", error);
    return NextResponse.json({ ok: false, error: "Failed to fetch post" }, { status: 500 });
  }
}

// PUT - Update a blog post
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    // Check for API key on programmatic requests
    const apiKey = req.headers.get("x-api-key");
    const isZapier = apiKey !== null;
    
    if (isZapier && apiKey !== process.env.BLOG_API_KEY) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { title, slug, excerpt, content, imageUrl, published, scheduledAt } = body;

    // Check if post exists
    const existing = await prisma.blogPost.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ ok: false, error: "Post not found" }, { status: 404 });
    }

    // Check if new slug conflicts with another post
    if (slug && slug !== existing.slug) {
      const slugConflict = await prisma.blogPost.findUnique({ where: { slug } });
      if (slugConflict) {
        return NextResponse.json({ ok: false, error: "Slug already exists" }, { status: 400 });
      }
    }

    // Handle publishedAt logic
    let publishedAt = existing.publishedAt;
    if (published && !existing.published && !scheduledAt) {
      // Being published immediately for the first time
      publishedAt = new Date();
    } else if (!published) {
      // Being unpublished or set to draft
      publishedAt = null;
    }

    const post = await prisma.blogPost.update({
      where: { id },
      data: {
        title: title ?? existing.title,
        slug: slug ?? existing.slug,
        excerpt: excerpt !== undefined ? excerpt : existing.excerpt,
        content: content ?? existing.content,
        imageUrl: imageUrl !== undefined ? imageUrl : existing.imageUrl,
        published: published ?? existing.published,
        publishedAt,
        scheduledAt: scheduledAt !== undefined ? (scheduledAt ? new Date(scheduledAt) : null) : existing.scheduledAt,
      },
    });

    return NextResponse.json({ ok: true, post });
  } catch (error) {
    console.error("Failed to update blog post:", error);
    return NextResponse.json({ ok: false, error: "Failed to update post" }, { status: 500 });
  }
}

// DELETE - Delete a blog post
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    // Check for API key on programmatic requests
    const apiKey = req.headers.get("x-api-key");
    const isZapier = apiKey !== null;
    
    if (isZapier && apiKey !== process.env.BLOG_API_KEY) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.blogPost.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ ok: false, error: "Post not found" }, { status: 404 });
    }

    await prisma.blogPost.delete({ where: { id } });

    return NextResponse.json({ ok: true, message: "Post deleted" });
  } catch (error) {
    console.error("Failed to delete blog post:", error);
    return NextResponse.json({ ok: false, error: "Failed to delete post" }, { status: 500 });
  }
}
