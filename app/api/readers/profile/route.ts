import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ ok: false, error: "Missing user ID" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, reader: user });
  } catch (err: any) {
    console.error("[GET /api/readers/profile] error:", err);
    return NextResponse.json({ ok: false, error: "Failed to fetch profile" }, { status: 500 });
  }
}

  try {
    let body;
    try {
      body = await req.json();
    } catch (err) {
      return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
    }
    const {
      readerId,
      displayName,
      phone,
      timezone,
      city,
      bio,
      playableAgeMin,
      playableAgeMax,
      gender,
      headshotUrl,
      rate15Usd,
      rateUsd,
      rate60Usd,
      unions,
      languages,
      specialties,
      links,
    } = body;

    if (!readerId) {
      return NextResponse.json({ ok: false, error: "Missing user ID" }, { status: 400 });
    }

    // Convert dollars to cents
    const rate15Cents = Math.max(0, Math.round(Number(rate15Usd || 0) * 100));
    const rate30Cents = Math.max(0, Math.round(Number(rateUsd || 0) * 100));
    const rate60Cents = Math.max(0, Math.round(Number(rate60Usd || 0) * 100));

    const ageMin = playableAgeMin === null || playableAgeMin === "" ? null : Number(playableAgeMin);
    const ageMax = playableAgeMax === null || playableAgeMax === "" ? null : Number(playableAgeMax);

    // Update user
    const updated = await prisma.user.update({
      where: { id: readerId },
      data: {
        displayName: displayName || null,
        phone: phone || null,
        timezone: timezone || "America/New_York",
        city: city || null,
        bio: bio || null,
        playableAgeMin: ageMin,
        playableAgeMax: ageMax,
        gender: gender || null,
        headshotUrl: headshotUrl || null,
        ratePer15Min: rate15Cents,
        ratePer30Min: rate30Cents,
        ratePer60Min: rate60Cents,
        unions: unions || [],
        languages: languages || [],
        specialties: specialties || [],
        links: links || [],
      },
    });

    return NextResponse.json({ ok: true, reader: updated });
  } catch (err: any) {
    console.error("[PUT /api/readers/profile] error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Failed to update profile" }, { status: 500 });
  }

// Fallback for unsupported methods
export async function POST() {
  return NextResponse.json({ ok: false, error: "Method not allowed" }, { status: 405 });
}
export async function DELETE() {
  return NextResponse.json({ ok: false, error: "Method not allowed" }, { status: 405 });
}
}