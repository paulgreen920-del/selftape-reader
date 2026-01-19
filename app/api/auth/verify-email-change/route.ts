import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: "Verification token is required" },
        { status: 400 }
      );
    }

    // Find the email change request
    const changeRequest = await prisma.email_change_requests.findUnique({
      where: { token },
      include: { User: true },
    });

    if (!changeRequest) {
      return NextResponse.json(
        { error: "Invalid verification token" },
        { status: 400 }
      );
    }

    // Check if token has expired
    if (changeRequest.expiresAt < new Date()) {
      // Clean up expired token
      await prisma.email_change_requests.delete({
        where: { id: changeRequest.id }
      });
      
      return NextResponse.json(
        { error: "Verification token has expired" },
        { status: 400 }
      );
    }

    // Check if the new email is still available
    const existingUser = await prisma.user.findUnique({
      where: { email: changeRequest.newEmail },
    });

    if (existingUser && existingUser.id !== changeRequest.userId) {
      // Clean up the request since email is no longer available
      await prisma.email_change_requests.delete({
        where: { id: changeRequest.id }
      });
      
      return NextResponse.json(
        { error: "This email address is no longer available" },
        { status: 400 }
      );
    }

    // Update the user's email
    await prisma.user.update({
      where: { id: changeRequest.userId },
      data: { email: changeRequest.newEmail },
    });

    // Clean up the change request
    await prisma.email_change_requests.delete({
      where: { id: changeRequest.id }
    });

    // Note: NextAuth session will be updated automatically on next request

    // Redirect to success page
    return NextResponse.redirect(
      new URL('/settings?email-changed=success', req.url),
      { status: 302 }
    );

  } catch (error) {
    console.error("[GET /api/auth/verify-email-change] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}