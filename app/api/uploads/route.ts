// app/api/uploads/route.ts
import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export const runtime = "nodejs"; // required for filesystem access

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const safeName = file.name.replace(/\s+/g, "_").replace(/[^\w.\-]/g, "");
    const filename = `${Date.now()}-${safeName}`;

    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(uploadDir, { recursive: true });

    const filepath = path.join(uploadDir, filename);
    await fs.writeFile(filepath, bytes);

    const url = `/uploads/${filename}`;
    const origin = new URL(req.url).origin; // e.g. http://localhost:3000
    const absoluteUrl = `${origin}${url}`;

    return NextResponse.json({ ok: true, url, absoluteUrl });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
