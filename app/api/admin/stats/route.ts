import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAdminAuth } from "@/lib/admin-auth";

/**
 * GET /api/admin/stats - Get dashboard statistics
 */
export async function GET(req: Request) {
  const adminCheck = await checkAdminAuth(req);
  if (!adminCheck.isAdmin) return adminCheck.response;

  try {
    const [
      totalUsers,
      totalReaders,
      totalActors,
      activeSubscriptions,
      totalBookings,
      pendingBookings,
      confirmedBookings,
      completedBookings,
      canceledBookings,
      totalRevenue,
      recentBookings,
      allUsers,
    ] = await Promise.all([
      // User counts
      prisma.user.count(),
      prisma.user.count({ where: { role: "READER" } }),
      prisma.user.count({ where: { role: "ACTOR" } }),
      prisma.user.count({ where: { subscriptionStatus: "active" } }),
      
      // Booking counts
      prisma.booking.count(),
      prisma.booking.count({ where: { status: "PENDING" } }),
      prisma.booking.count({ where: { status: "CONFIRMED" } }),
      prisma.booking.count({ where: { status: "COMPLETED" } }),
      prisma.booking.count({ where: { status: "CANCELED" } }),

      // Revenue (sum of platform fees).
      //
      // Counts CONFIRMED as well as COMPLETED. Checkout captures immediately
      // (no capture_method: 'manual' anywhere), so a booking reaches CONFIRMED
      // only after the money has actually moved. Nothing in the codebase sets
      // COMPLETED automatically — it can only be applied by hand via the admin
      // tools page — so filtering on COMPLETED alone reported $0 forever.
      //
      // CANCELED is excluded, which is also how refunds are netted out: every
      // refund path sets status to CANCELED, so refunded fees never count.
      prisma.booking.aggregate({
        where: { status: { in: ["CONFIRMED", "COMPLETED"] } },
        _sum: { platformFeeCents: true },
      }),
      
      // Recent bookings
      prisma.booking.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          User_Booking_actorIdToUser: {
            select: { displayName: true, email: true },
          },
          User_Booking_readerIdToUser: {
            select: { displayName: true, email: true },
          },
        },
      }),
      
      // All users with IDs
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          displayName: true,
          email: true,
          role: true,
          subscriptionStatus: true,
          createdAt: true,
        },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      stats: {
        users: {
          total: totalUsers,
          readers: totalReaders,
          actors: totalActors,
          activeSubscriptions,
        },
        bookings: {
          total: totalBookings,
          pending: pendingBookings,
          confirmed: confirmedBookings,
          completed: completedBookings,
          canceled: canceledBookings,
        },
        revenue: {
          totalCents: totalRevenue._sum.platformFeeCents || 0,
          totalUsd: ((totalRevenue._sum.platformFeeCents || 0) / 100).toFixed(2),
        },
        recentBookings,
        allUsers,
      },
    });
  } catch (err: any) {
    console.error("[admin/stats] Error:", err);
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}
