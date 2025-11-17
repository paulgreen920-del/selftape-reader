// app/api/uploads/route.ts

import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

export const runtime = "edge"; // Vercel Blob requires edge runtime

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Generate a unique filename
    const safeName = file.name.replace(/\s+/g, "_").replace(/[^\w.\-]/g, "");
    const filename = `${Date.now()}-${safeName}`;

    // Use standard Vercel Blob env var
    const blobToken = process.env.selftapeblob_READ_WRITE_TOKEN;
    if (!blobToken) {
      return NextResponse.json({ error: "Blob token not set in environment" }, { status: 500 });
    }

    // Upload to Vercel Blob
    const arrayBuffer = await file.arrayBuffer();
    const { url } = await put(filename, arrayBuffer, {
      access: "public", // Change to "private" if you want restricted access
      contentType: file.type || undefined,
      token: blobToken,
    });

    return NextResponse.json({ ok: true, url, absoluteUrl: url });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || "Upload failed" }, { status: 500 });
  }
}
