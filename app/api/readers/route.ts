import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "../../../lib/prisma";

/**
 * GET /api/readers?id=USER_ID
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const id = (url.searchParams.get("id") || url.searchParams.get("userId") || "").trim();
    if (!id) {
      return NextResponse.json({ ok: false, error: "Missing id/userId" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: { 
        id: true, 
        name: true, 
        email: true,
        stripeAccountId: true, // Include for payment page check
        subscriptionStatus: true, // Include for subscription page check
        onboardingStep: true, // Include for onboarding flow
      },
    });

    if (!user) {
      return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, reader: user }, { status: 200 });
  } catch (err: any) {
    console.error("[GET /api/readers] error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Server error" }, { status: 500 });
  }
}

/**
 * POST /api/readers - Complete reader profile setup
 */
export async function POST(req: Request) {
  try {
    const raw = await req.text();
    let body: any = {};
    try {
      body = raw ? JSON.parse(raw) : {};
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const {
      displayName,
      email,
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
      unions = [],
      languages = [],
      specialties = [],
      links = [],
    } = body ?? {};

    // Validate all required fields
    if (!displayName?.trim()) {
      return NextResponse.json(
        { ok: false, error: "Display name is required" },
        { status: 400 }
      );
    }
    if (!email?.trim()) {
      return NextResponse.json(
        { ok: false, error: "Email is required" },
        { status: 400 }
      );
    }
    if (!headshotUrl?.trim()) {
      return NextResponse.json(
        { ok: false, error: "Headshot is required" },
        { status: 400 }
      );
    }
    if (!phone?.trim()) {
      return NextResponse.json(
        { ok: false, error: "Phone number is required" },
        { status: 400 }
      );
    }
    if (!city?.trim()) {
      return NextResponse.json(
        { ok: false, error: "City is required" },
        { status: 400 }
      );
    }
    if (!bio?.trim()) {
      return NextResponse.json(
        { ok: false, error: "Bio is required" },
        { status: 400 }
      );
    }
    if (!gender?.trim()) {
      return NextResponse.json(
        { ok: false, error: "Gender is required" },
        { status: 400 }
      );
    }
    if (!Array.isArray(unions) || unions.length === 0) {
      return NextResponse.json(
        { ok: false, error: "At least one union status is required" },
        { status: 400 }
      );
    }
    if (!Array.isArray(languages) || languages.length === 0) {
      return NextResponse.json(
        { ok: false, error: "At least one language is required" },
        { status: 400 }
      );
    }
    if (!Array.isArray(specialties) || specialties.length === 0) {
      return NextResponse.json(
        { ok: false, error: "At least one specialty is required" },
        { status: 400 }
      );
    }

    // Validate playable age range
    if (playableAgeMin === null || playableAgeMin === "" || playableAgeMin === undefined) {
      return NextResponse.json(
        { ok: false, error: "Playable age minimum is required" },
        { status: 400 }
      );
    }
    if (playableAgeMax === null || playableAgeMax === "" || playableAgeMax === undefined) {
      return NextResponse.json(
        { ok: false, error: "Playable age maximum is required" },
        { status: 400 }
      );
    }

    const ageMin = Number(playableAgeMin);
    const ageMax = Number(playableAgeMax);

    if (!Number.isFinite(ageMin) || !Number.isFinite(ageMax)) {
      return NextResponse.json(
        { ok: false, error: "Invalid playable age values" },
        { status: 400 }
      );
    }

    if (ageMin > ageMax) {
      return NextResponse.json(
        { ok: false, error: "Playable age: Min must be ≤ Max." },
        { status: 400 }
      );
    }

    // Validate rates (must be positive numbers)
    if (!rate15Usd || Number(rate15Usd) <= 0) {
      return NextResponse.json(
        { ok: false, error: "Valid rate for 15 minutes is required" },
        { status: 400 }
      );
    }
    if (!rateUsd || Number(rateUsd) <= 0) {
      return NextResponse.json(
        { ok: false, error: "Valid rate for 30 minutes is required" },
        { status: 400 }
      );
    }
    if (!rate60Usd || Number(rate60Usd) <= 0) {
      return NextResponse.json(
        { ok: false, error: "Valid rate for 60 minutes is required" },
        { status: 400 }
      );
    }

    // Convert rates to cents
    const rate15Cents = Math.round(Number(rate15Usd) * 100);
    const rate30Cents = Math.round(Number(rateUsd) * 100);
    const rate60Cents = Math.round(Number(rate60Usd) * 100);

    // Find the user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "User not found. Please sign up first." },
        { status: 404 }
      );
    }

    // Update user with reader profile data (DON'T change role yet - wait for payment)
    // All required fields have been validated above
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        displayName,
        phone,
        timezone: timezone || "America/New_York",
        city,
        bio,
        playableAgeMin: ageMin,
        playableAgeMax: ageMax,
        gender,
        headshotUrl,
        ratePer15Min: rate15Cents,
        ratePer30Min: rate30Cents,
        ratePer60Min: rate60Cents,
        unions: unions as Prisma.InputJsonValue,
        languages: languages as Prisma.InputJsonValue,
        specialties: specialties as Prisma.InputJsonValue,
        links: links as Prisma.InputJsonValue,
        onboardingStep: "schedule",
      },
      select: { id: true, email: true, displayName: true },
    });

    // Return success (role will be updated to READER after payment succeeds)
    return NextResponse.json(
      { ok: true, readerId: updated.id, reader: updated },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[POST /api/readers] error:", err);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}