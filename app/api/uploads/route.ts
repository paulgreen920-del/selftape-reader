// app/api/uploads/route.ts


// Max upload size in bytes (4MB)
const MAX_UPLOAD_SIZE = 4 * 1024 * 1024;

import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";


// Switch to Node.js runtime to support custom body size limit
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '4mb',
    },
  },
};

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

    // Check file size (File.size is in bytes)
    if (file.size > MAX_UPLOAD_SIZE) {
      return NextResponse.json(
        { ok: false, error: `File too large. Please upload an image no larger than 4MB.` },
        { status: 413 }
      );
    }

    // Generate a safe, unique filename
    const safeName = file.name
      .replace(/\s+/g, "_")
      .replace(/[^\w.\-]/g, "");
    const filename = `${Date.now()}-${safeName}`;

    // Always use Blob storage for uploads
    const blobToken = process.env.selftapeblob_READ_WRITE_TOKEN;
    if (!blobToken) {
      console.error("Missing selftapeblob_READ_WRITE_TOKEN env var");
      return NextResponse.json(
        { ok: false, error: "Blob token not set in environment" },
        { status: 500 }
      );
    }
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
