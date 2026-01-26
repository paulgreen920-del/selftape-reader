import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

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
    const { id } = await params;
    const body = await req.json();
    const { title, slug, excerpt, content, imageUrl, published } = body;

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
    if (published && !existing.published) {
      // Being published for the first time
      publishedAt = new Date();
    } else if (!published) {
      // Being unpublished
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
