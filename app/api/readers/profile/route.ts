import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

async function handleGet(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ ok: false, error: "Missing user ID" }, { status: 400 });
    }
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, reader: user });
  } catch (err: any) {
    console.error("[GET /api/readers/profile] error:", err);
    return NextResponse.json({ ok: false, error: "Failed to fetch profile" }, { status: 500 });
  }
}

async function handlePut(req: Request) {
  try {
    let body;
    try {
      body = await req.json();
    } catch (err) {
      return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
    }
    
    const { readerId } = body;
    
    if (!readerId) {
      return NextResponse.json({ ok: false, error: "Missing user ID" }, { status: 400 });
    }

    // Build update data object with only the fields that were provided
    // This prevents overwriting existing data with null when a field isn't sent
    const updateData: any = {};

    // String fields - only update if explicitly provided (not undefined)
    if (body.displayName !== undefined) {
      updateData.displayName = body.displayName || null;
    }
    if (body.phone !== undefined) {
      updateData.phone = body.phone || null;
    }
    if (body.timezone !== undefined) {
      updateData.timezone = body.timezone || "America/New_York";
    }
    if (body.city !== undefined) {
      updateData.city = body.city || null;
    }
    if (body.bio !== undefined) {
      updateData.bio = body.bio || null;
    }
    if (body.gender !== undefined) {
      updateData.gender = body.gender || null;
    }
    if (body.headshotUrl !== undefined) {
      updateData.headshotUrl = body.headshotUrl || null;
    }

    // Age range - only update if provided
    if (body.playableAgeMin !== undefined) {
      updateData.playableAgeMin = body.playableAgeMin === null || body.playableAgeMin === "" 
        ? null 
        : Number(body.playableAgeMin);
    }
    if (body.playableAgeMax !== undefined) {
      updateData.playableAgeMax = body.playableAgeMax === null || body.playableAgeMax === "" 
        ? null 
        : Number(body.playableAgeMax);
    }

    // Rates - only update if provided (convert dollars to cents)
    if (body.rate15Usd !== undefined) {
      updateData.ratePer15Min = Math.max(0, Math.round(Number(body.rate15Usd || 0) * 100));
    }
    if (body.rateUsd !== undefined) {
      updateData.ratePer30Min = Math.max(0, Math.round(Number(body.rateUsd || 0) * 100));
    }
    if (body.rate60Usd !== undefined) {
      updateData.ratePer60Min = Math.max(0, Math.round(Number(body.rate60Usd || 0) * 100));
    }

    // Array fields - only update if provided
    if (body.unions !== undefined) {
      updateData.unions = body.unions || [];
    }
    if (body.languages !== undefined) {
      updateData.languages = body.languages || [];
    }
    if (body.specialties !== undefined) {
      updateData.specialties = body.specialties || [];
    }
    if (body.links !== undefined) {
      updateData.links = body.links || [];
    }

    // Only proceed if there's something to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ ok: false, error: "No fields to update" }, { status: 400 });
    }

    // Update user with only the provided fields
    const updated = await prisma.user.update({
      where: { id: readerId },
      data: updateData,
    });
    
    return NextResponse.json({ ok: true, reader: updated });
  } catch (err: any) {
    console.error("[PUT /api/readers/profile] error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Failed to update profile" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    return await handleGet(req);
  } catch (err: any) {
    console.error("[GET /api/readers/profile] top-level error:", err);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    return await handlePut(req);
  } catch (err: any) {
    console.error("[PUT /api/readers/profile] top-level error:", err);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

// Fallback for unsupported methods
export async function POST() {
  return NextResponse.json({ ok: false, error: "Method not allowed" }, { status: 405 });
}
export async function DELETE() {
  return NextResponse.json({ ok: false, error: "Method not allowed" }, { status: 405 });
}