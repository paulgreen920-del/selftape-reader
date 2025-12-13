import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAdminAuth } from "@/lib/admin-auth";

/**
 * GET /api/admin/bookings - List all bookings with filters
 */
export async function GET(req: Request) {
  const adminCheck = await checkAdminAuth(req);
  if (!adminCheck.isAdmin) return adminCheck.response;

  try {
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const search = url.searchParams.get("search");
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const readerId = url.searchParams.get("readerId");
    const date = url.searchParams.get("date");

    const where: any = {};

    if (readerId) where.readerId = readerId;
    
    if (date) {
      const start = new Date(date + "T00:00:00Z");
      const end = new Date(date + "T23:59:59Z");
      where.startTime = { gte: start, lt: end };
    }
    
    if (status && ["PENDING", "CONFIRMED", "COMPLETED", "CANCELED"].includes(status)) {
      where.status = status;
    }
    
    if (search) {
      where.OR = [
        { User_Booking_actorIdToUser: { email: { contains: search, mode: "insensitive" } } },
        { User_Booking_readerIdToUser: { email: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        take: limit,
        skip: (page - 1) * limit,
        orderBy: { createdAt: "desc" },
        include: {
          User_Booking_actorIdToUser: {
            select: { id: true, email: true, displayName: true },
          },
          User_Booking_readerIdToUser: {
            select: { id: true, email: true, displayName: true },
          },
        },
      }),
      prisma.booking.count({ where }),
    ]);

    return NextResponse.json({
      ok: true,
      bookings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    console.error("[admin/bookings] Error:", err);
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/bookings - Update booking
 */
export async function PUT(req: Request) {
  const adminCheck = await checkAdminAuth(req);
  if (!adminCheck.isAdmin) return adminCheck.response;

  try {
    const body = await req.json();
    const { bookingId, updates } = body;

    if (!bookingId) {
      return NextResponse.json(
        { ok: false, error: "Missing bookingId" },
        { status: 400 }
      );
    }

    const allowedUpdates: any = {};
    if (updates.status) allowedUpdates.status = updates.status;
    if (updates.notes !== undefined) allowedUpdates.notes = updates.notes;

    const booking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        ...allowedUpdates,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true, booking });
  } catch (err: any) {
    console.error("[admin/bookings] Update error:", err);
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/bookings - Delete booking
 */
export async function DELETE(req: Request) {
  const adminCheck = await checkAdminAuth(req);
  if (!adminCheck.isAdmin) return adminCheck.response;

  try {
    const url = new URL(req.url);
    const bookingId = url.searchParams.get("bookingId");

    if (!bookingId) {
      return NextResponse.json(
        { ok: false, error: "Missing bookingId" },
        { status: 400 }
      );
    }

    await prisma.booking.delete({
      where: { id: bookingId },
    });

    return NextResponse.json({ ok: true, message: "Booking deleted" });
  } catch (err: any) {
    console.error("[admin/bookings] Delete error:", err);
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}