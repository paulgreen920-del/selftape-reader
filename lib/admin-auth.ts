import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Middleware to check if user is authenticated and has ADMIN role
 * Usage: const adminCheck = await checkAdminAuth(req);
 *        if (!adminCheck.isAdmin) return adminCheck.response;
 */
export async function checkAdminAuth(req: Request) {
  try {
    const cookies = req.headers.get("cookie") || "";
    
    // Look for session cookie (format: session={"userId":"...","email":"..."})
    const sessionMatch = cookies.match(/session=([^;]+)/);
    
    console.log('[admin-auth] Checking admin auth...');
    console.log('[admin-auth] Cookie header present:', !!cookies);
    console.log('[admin-auth] session found in cookie:', !!sessionMatch);
    
    if (!sessionMatch) {
      console.log('[admin-auth] ❌ No session cookie');
      return {
        isAdmin: false,
        response: NextResponse.json(
          { ok: false, error: "Not authenticated" },
          { status: 401 }
        ),
      };
    }

    // Decode and parse session cookie
    let session;
    try {
      const sessionValue = decodeURIComponent(sessionMatch[1]);
      session = JSON.parse(sessionValue);
      console.log('[admin-auth] Session parsed, userId:', session.userId);
    } catch (parseErr) {
      console.error('[admin-auth] Failed to parse session cookie:', parseErr);
      return {
        isAdmin: false,
        response: NextResponse.json(
          { ok: false, error: "Invalid session" },
          { status: 401 }
        ),
      };
    }

    if (!session.userId) {
      console.log('[admin-auth] ❌ No userId in session');
      return {
        isAdmin: false,
        response: NextResponse.json(
          { ok: false, error: "Invalid session" },
          { status: 401 }
        ),
      };
    }

    const userId = session.userId;
    console.log('[admin-auth] Looking up user:', userId);
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true },
    });

    console.log('[admin-auth] User found:', !!user);
    console.log('[admin-auth] User role:', user?.role);

    if (!user || user.role !== "ADMIN") {
      console.log('[admin-auth] ❌ User is not ADMIN');
      return {
        isAdmin: false,
        response: NextResponse.json(
          { ok: false, error: "Unauthorized - Admin access required" },
          { status: 403 }
        ),
      };
    }

    console.log('[admin-auth] ✅ Admin access granted');
    return {
      isAdmin: true,
      user,
    };
  } catch (err: any) {
    console.error('[admin-auth] Error:', err);
    return {
      isAdmin: false,
      response: NextResponse.json(
        { ok: false, error: "Authentication error" },
        { status: 500 }
      ),
    };
  }
}
