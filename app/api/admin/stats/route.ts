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
      completedBookings,
      canceledBookings,
      totalRevenue,
      recentBookings,
    ] = await Promise.all([
      // User counts
      prisma.user.count(),
      prisma.user.count({ where: { role: "READER" } }),
      prisma.user.count({ where: { role: "ACTOR" } }),
      prisma.user.count({ where: { subscriptionStatus: "active" } }),
      
      // Booking counts
      prisma.booking.count(),
      prisma.booking.count({ where: { status: "PENDING" } }),
      prisma.booking.count({ where: { status: "COMPLETED" } }),
      prisma.booking.count({ where: { status: "CANCELED" } }),
      
      // Revenue (sum of platform fees)
      prisma.booking.aggregate({
        where: { status: "COMPLETED" },
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
          completed: completedBookings,
          canceled: canceledBookings,
        },
        revenue: {
          totalCents: totalRevenue._sum.platformFeeCents || 0,
          totalUsd: ((totalRevenue._sum.platformFeeCents || 0) / 100).toFixed(2),
        },
        recentBookings,
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
