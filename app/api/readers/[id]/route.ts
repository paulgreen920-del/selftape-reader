// app/api/readers/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { 
        id,
        role: { in: ["READER", "ADMIN"] }
      },
      select: { id: true, displayName: true, email: true },
    });

    if (!user) {
      return NextResponse.json({ ok: false, error: "Reader not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, reader: user }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
