import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { id: string };

/**
 * DELETE /api/bookings/[id]/delete
 * Delete a PENDING booking without counting as a cancellation.
 * This is for abandoned bookings where payment was never completed.
 */
export async function POST(
  req: Request,
  props: { params: Params } | { params: Promise<Params> }
) {
  try {
    const raw = (props as any).params;
    const resolved: Params = typeof raw?.then === "function" ? await raw : raw;
    const bookingId = resolved.id;

    // Get current user
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { ok: false, error: "You must be logged in to delete a booking" },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    console.log(`[delete-booking] User ${userId} attempting to delete booking ${bookingId}`);

    // Find the booking
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        actorId: true,
        readerId: true,
        status: true,
        startTime: true,
        stripePaymentIntentId: true,
      },
    });

    if (!booking) {
      return NextResponse.json(
        { ok: false, error: "Booking not found" },
        { status: 404 }
      );
    }

    // Check if user is actor or reader on this booking (or admin)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isAdmin: true },
    });

    const isActor = booking.actorId === userId;
    const isReader = booking.readerId === userId;
    const isAdmin = user?.isAdmin === true;

    if (!isActor && !isReader && !isAdmin) {
      return NextResponse.json(
        { ok: false, error: "You are not authorized to delete this booking" },
        { status: 403 }
      );
    }

    // Only allow deletion of PENDING bookings
    if (booking.status !== "PENDING") {
      return NextResponse.json(
        { ok: false, error: "Only pending bookings can be deleted. Use cancel for confirmed bookings." },
        { status: 400 }
      );
    }

    // Check if there's a payment intent - if so, they should use cancel instead
    if (booking.stripePaymentIntentId) {
      return NextResponse.json(
        { ok: false, error: "This booking has a payment. Please use cancel instead." },
        { status: 400 }
      );
    }

    console.log(`[delete-booking] Deleting pending booking ${bookingId} - no payment was made`);

    // Delete the booking (this will also free up the availability slot)
    await prisma.booking.delete({
      where: { id: bookingId },
    });

    console.log(`[delete-booking] Successfully deleted booking ${bookingId}`);

    return NextResponse.json({
      ok: true,
      message: "Booking deleted successfully",
    });
  } catch (err: any) {
    console.error("[delete-booking] Error:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to delete booking" },
      { status: 500 }
    );
  }
}
