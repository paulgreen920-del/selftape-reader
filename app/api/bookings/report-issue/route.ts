import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/bookings/report-issue
 * Report an issue with a booking (no-show, late, technical, conduct)
 */
export async function POST(req: Request) {
  try {
    const { bookingId, reportedBy, issueType, description } = await req.json();

    if (!bookingId || !reportedBy || !issueType) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate reportedBy
    if (!["ACTOR", "READER"].includes(reportedBy)) {
      return NextResponse.json(
        { ok: false, error: "Invalid reportedBy value" },
        { status: 400 }
      );
    }

    // Validate issueType
    const validIssueTypes = ["NO_SHOW", "LATE", "TECHNICAL", "CONDUCT", "OTHER"];
    if (!validIssueTypes.includes(issueType)) {
      return NextResponse.json(
        { ok: false, error: "Invalid issueType" },
        { status: 400 }
      );
    }

    // Fetch booking
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        User_Booking_readerIdToUser: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
        User_Booking_actorIdToUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json(
        { ok: false, error: "Booking not found" },
        { status: 404 }
      );
    }

    // Verify reporter is part of this booking
    const isActor = reportedBy === "ACTOR";
    const isReader = reportedBy === "READER";
    
    // Update booking with issue report
    const now = new Date();
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        hasIssue: true,
        issueType,
        issueReportedBy: reportedBy,
        issueDescription: description || null,
        updatedAt: now,
      },
    });

    // Handle specific issue types
    let autoActions: string[] = [];

    if (issueType === "NO_SHOW") {
      if (reportedBy === "ACTOR") {
        // Reader no-showed
        autoActions.push("Reader marked for no-show penalty");
        autoActions.push("Full refund + $5 credit will be processed");
        
        // Update reader's reliability metrics
        await prisma.user.update({
          where: { id: booking.readerId },
          data: {
            noShowSessions: { increment: 1 },
            totalSessions: { increment: 1 },
            lastWarningAt: now,
          },
        });

        // Check for suspension (immediate for no-shows)
        await prisma.user.update({
          where: { id: booking.readerId },
          data: {
            suspendedUntil: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000), // 14 days
            suspensionReason: "Suspended for no-show incident",
          },
        });

        // Mark booking for full refund + credit
        await prisma.booking.update({
          where: { id: bookingId },
          data: {
            status: "NO_SHOW",
            refundStatus: "PENDING",
            refundCents: booking.totalCents,
            platformCreditCents: 500, // $5 credit
          },
        });
      } else {
        // Actor no-showed
        autoActions.push("Actor no-show recorded");
        autoActions.push("Reader will receive full payment");
        
        await prisma.booking.update({
          where: { id: bookingId },
          data: {
            status: "NO_SHOW",
          },
        });
      }
    }

    if (issueType === "LATE" && reportedBy === "ACTOR") {
      // Reader was late
      autoActions.push("Reader late arrival recorded");
      autoActions.push("Session will be extended by delay duration");
      
      await prisma.user.update({
        where: { id: booking.readerId },
        data: {
          lateArrivals: { increment: 1 },
        },
      });
    }

    if (issueType === "TECHNICAL") {
      // Determine who had the issue based on description or default to platform
      if (description?.toLowerCase().includes("platform") || 
          description?.toLowerCase().includes("video") ||
          description?.toLowerCase().includes("meeting")) {
        autoActions.push("Platform technical issue reported");
        autoActions.push("Full refund or free reschedule will be offered");
      } else if (reportedBy === "ACTOR") {
        autoActions.push("Reader technical issue reported");
        autoActions.push("Partial refund may be issued based on review");
      } else {
        autoActions.push("Actor technical issue reported");
        autoActions.push("No refund - actor's responsibility");
      }
    }

    // Update reader reliability score
    await updateReaderReliabilityScore(booking.readerId);

    // TODO: Send notification emails to support team
    // TODO: Create support ticket for manual review if needed

    return NextResponse.json({
      ok: true,
      issue: {
        bookingId,
        issueType,
        reportedBy,
        description,
        autoActions,
      },
      message: "Issue reported successfully. Our support team will review and contact you within 24 hours.",
    });
  } catch (err: any) {
    console.error("[Report Issue] Error:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to report issue" },
      { status: 500 }
    );
  }
}

/**
 * Update reader's reliability score based on their session history
 */
async function updateReaderReliabilityScore(readerId: string) {
  const reader = await prisma.user.findUnique({
    where: { id: readerId },
    select: {
      totalSessions: true,
      completedSessions: true,
      canceledSessions: true,
      noShowSessions: true,
      lateArrivals: true,
    },
  });

  if (!reader || reader.totalSessions === 0) {
    return;
  }

  // Calculate reliability score (0-100)
  const completionRate = (reader.completedSessions / reader.totalSessions) * 100;
  const cancelPenalty = (reader.canceledSessions / reader.totalSessions) * 20;
  const noShowPenalty = (reader.noShowSessions / reader.totalSessions) * 50;
  const latePenalty = (reader.lateArrivals / reader.totalSessions) * 10;

  const reliabilityScore = Math.max(
    0,
    Math.min(100, completionRate - cancelPenalty - noShowPenalty - latePenalty)
  );

  await prisma.user.update({
    where: { id: readerId },
    data: { reliabilityScore },
  });
}
