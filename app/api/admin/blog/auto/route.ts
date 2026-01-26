import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { put } from "@vercel/blob";

export async function POST(req: NextRequest) {
  try {
    // Check API key
    const apiKey = req.headers.get("x-api-key");
    if (apiKey !== process.env.BLOG_API_KEY) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // Unescape newlines from Zapier
    if (body.content) {
      body.content = body.content.replace(/\\n/g, '\n').replace(/\\r/g, '\r');
    }
    if (body.excerpt) {
      body.excerpt = body.excerpt.replace(/\\n/g, '\n').replace(/\\r/g, '\r');
    }

    const { title, slug, excerpt, content, dalleImageUrl } = body;

    if (!title || !slug || !content) {
      return NextResponse.json({ 
        ok: false, 
        error: "Title, slug, and content are required",
        received: { title: !!title, slug: !!slug, content: !!content }
      }, { status: 400 });
    }

    // Check if slug already exists
    const existing = await prisma.blogPost.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json({ ok: false, error: "Slug already exists" }, { status: 400 });
    }

    // Upload image if provided
    let imageUrl = null;
    if (dalleImageUrl) {
      try {
        const imageResponse = await fetch(dalleImageUrl);
        if (imageResponse.ok) {
          const imageBuffer = await imageResponse.arrayBuffer();
          const contentType = imageResponse.headers.get("content-type") || "image/png";
          const blob = await put(`blog-images/${slug}.png`, imageBuffer, {
            access: "public",
            contentType,
          });
          imageUrl = blob.url;
        }
      } catch (imgError) {
        console.error("Failed to upload image:", imgError);
        // Continue without image
      }
    }

    // Create the post
    const post = await prisma.blogPost.create({
      data: {
        title,
        slug,
        excerpt: excerpt || null,
        content,
        imageUrl,
        published: false,
        publishedAt: null,
      },
    });

    return NextResponse.json({ ok: true, post });
  } catch (error: any) {
    console.error("Failed to create blog post:", error);
    return NextResponse.json({ 
      ok: false, 
      error: "Failed to create post",
      detail: error?.message || "Unknown error"
    }, { status: 500 });
  }
}
