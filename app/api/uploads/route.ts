// app/api/uploads/route.ts

import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge"; // fine to keep edge here

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null; // make sure your <input name="file" />

    if (!file) {
      return NextResponse.json(
        { ok: false, error: "No file provided" },
        { status: 400 }
      );
    }

    // Generate a safe, unique filename
    const safeName = file.name
      .replace(/\s+/g, "_")
      .replace(/[^\w.\-]/g, "");
    const filename = `${Date.now()}-${safeName}`;

    // Use the env var Vercel actually created for your store
    const blobToken = process.env.selftapeblob_READ_WRITE_TOKEN;
    if (!blobToken) {
      console.error("Missing selftapeblob_READ_WRITE_TOKEN env var");
      return NextResponse.json(
        { ok: false, error: "Blob token not set in environment" },
        { status: 500 }
      );
    }

    // Upload to Vercel Blob
    const arrayBuffer = await file.arrayBuffer();
    const { url } = await put(filename, arrayBuffer, {
      access: "public", // or "private" if you change your usage later
      contentType: file.type || undefined,
      token: blobToken,
    });

    return NextResponse.json(
      { ok: true, url, absoluteUrl: url },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Upload failed" },
      { status: 500 }
    );
  }
}
