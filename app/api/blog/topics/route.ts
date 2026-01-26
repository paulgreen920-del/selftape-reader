import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const posts = await prisma.blogPost.findMany({
      select: {
        slug: true,
        title: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const topics = posts.map(p => `- ${p.slug}: "${p.title}"`).join('\n');

    return NextResponse.json({ 
      ok: true, 
      count: posts.length,
      topics 
    });
  } catch (error) {
    console.error("Failed to fetch topics:", error);
    return NextResponse.json({ ok: false, error: "Failed to fetch topics" }, { status: 500 });
  }
}
