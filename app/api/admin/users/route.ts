import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAdminAuth } from "@/lib/admin-auth";

/**
 * GET /api/admin/users - List all users with filters
 */
export async function GET(req: Request) {
  const adminCheck = await checkAdminAuth(req);
  if (!adminCheck.isAdmin) return adminCheck.response;

  try {
    const url = new URL(req.url);
    const role = url.searchParams.get("role");
    const search = url.searchParams.get("search");
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "50");

    const where: any = {};
    
    if (role && (role === "ACTOR" || role === "READER" || role === "ADMIN")) {
      where.role = role;
    }
    
    if (search) {
      where.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { displayName: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        take: limit,
        skip: (page - 1) * limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          name: true,
          displayName: true,
          phone: true,
          headshotUrl: true,
          bio: true,
          city: true,
          timezone: true,
          role: true,
          isActive: true,
          subscriptionStatus: true,
          stripeAccountId: true,
          stripeCustomerId: true,
          subscriptionId: true,
          onboardingStep: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      ok: true,
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    console.error("[admin/users] Error:", err);
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/users - Update user
 */
export async function PUT(req: Request) {
  const adminCheck = await checkAdminAuth(req);
  if (!adminCheck.isAdmin) return adminCheck.response;

  try {
    const body = await req.json();
    const { userId, updates } = body;

    if (!userId) {
      return NextResponse.json(
        { ok: false, error: "Missing userId" },
        { status: 400 }
      );
    }

    // Allow updating most user fields
    const allowedUpdates: any = {};
    if (updates.email !== undefined) allowedUpdates.email = updates.email;
    if (updates.name !== undefined) allowedUpdates.name = updates.name;
    if (updates.displayName !== undefined) allowedUpdates.displayName = updates.displayName;
    if (updates.phone !== undefined) allowedUpdates.phone = updates.phone;
    if (updates.headshotUrl !== undefined) allowedUpdates.headshotUrl = updates.headshotUrl;
    if (updates.bio !== undefined) allowedUpdates.bio = updates.bio;
    if (updates.city !== undefined) allowedUpdates.city = updates.city;
    if (updates.timezone !== undefined) allowedUpdates.timezone = updates.timezone;
    if (updates.role !== undefined) allowedUpdates.role = updates.role;
    if (updates.isActive !== undefined) allowedUpdates.isActive = updates.isActive;
    if (updates.subscriptionStatus !== undefined) allowedUpdates.subscriptionStatus = updates.subscriptionStatus;
    if (updates.onboardingStep !== undefined) allowedUpdates.onboardingStep = updates.onboardingStep;
    if (updates.stripeAccountId !== undefined) allowedUpdates.stripeAccountId = updates.stripeAccountId;
    if (updates.stripeCustomerId !== undefined) allowedUpdates.stripeCustomerId = updates.stripeCustomerId;
    if (updates.subscriptionId !== undefined) allowedUpdates.subscriptionId = updates.subscriptionId;

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...allowedUpdates,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true, user });
  } catch (err: any) {
    console.error("[admin/users] Update error:", err);
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/users - Delete user
 */
export async function DELETE(req: Request) {
  const adminCheck = await checkAdminAuth(req);
  if (!adminCheck.isAdmin) return adminCheck.response;

  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { ok: false, error: "Missing userId" },
        { status: 400 }
      );
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({ ok: true, message: "User deleted" });
  } catch (err: any) {
    console.error("[admin/users] Delete error:", err);
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}
