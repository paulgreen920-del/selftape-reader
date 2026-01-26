import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET - List all blog posts (admin view - includes unpublished)
export async function GET() {
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
    const body = await req.json();
    const { title, slug, excerpt, content, imageUrl, published } = body;

    if (!title || !slug || !content) {
      return NextResponse.json({ ok: false, error: "Title, slug, and content are required" }, { status: 400 });
    }

    // Check if slug already exists
    const existing = await prisma.blogPost.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json({ ok: false, error: "Slug already exists" }, { status: 400 });
    }

    const post = await prisma.blogPost.create({
      data: {
        title,
        slug,
        excerpt: excerpt || null,
        content,
        imageUrl: imageUrl || null,
        published: published || false,
        publishedAt: published ? new Date() : null,
      },
    });

    return NextResponse.json({ ok: true, post });
  } catch (error) {
    console.error("Failed to create blog post:", error);
    return NextResponse.json({ ok: false, error: "Failed to create post" }, { status: 500 });
  }
}
