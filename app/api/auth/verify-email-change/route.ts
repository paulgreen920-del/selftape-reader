import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

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

    // Update session cookie if this is the current user
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session");
    
    if (sessionCookie?.value) {
      try {
        const sessionData = JSON.parse(sessionCookie.value);
        if (sessionData.userId === changeRequest.userId) {
          // Update email in session data
          sessionData.email = changeRequest.newEmail;
          cookieStore.set("session", JSON.stringify(sessionData), {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 30 * 24 * 60 * 60, // 30 days
          });
        }
      } catch (sessionError) {
        console.error("Failed to update session:", sessionError);
        // Non-critical error, email change was successful
      }
    }

    // Return a success page redirect or JSON response
    // You could redirect to a success page here
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
