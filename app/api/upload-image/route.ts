import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

export async function POST(req: NextRequest) {
  try {
    // Check API key
    const apiKey = req.headers.get("x-api-key");
    if (apiKey !== process.env.BLOG_API_KEY) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { imageUrl, filename } = body;

    if (!imageUrl) {
      return NextResponse.json({ ok: false, error: "imageUrl is required" }, { status: 400 });
    }

    // Download the image from the provided URL (e.g., DALL-E)
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      return NextResponse.json({ ok: false, error: "Failed to fetch image" }, { status: 400 });
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const contentType = imageResponse.headers.get("content-type") || "image/png";
    
    // Generate filename if not provided
    const finalFilename = filename || `blog-${Date.now()}.png`;

    // Upload to Vercel Blob
    const blob = await put(`blog-images/${finalFilename}`, imageBuffer, {
      access: "public",
      contentType,
    });

    return NextResponse.json({ ok: true, url: blob.url });
  } catch (error) {
    console.error("Failed to upload image:", error);
    return NextResponse.json({ ok: false, error: "Failed to upload image" }, { status: 500 });
  }
}
