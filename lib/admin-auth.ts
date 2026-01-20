import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Middleware to check if user is authenticated and has isAdmin flag
 * Usage: const adminCheck = await checkAdminAuth(req);
 *        if (!adminCheck.isAdmin) return adminCheck.response;
 */
export async function checkAdminAuth(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    console.log('[admin-auth] Checking admin auth...');
    console.log('[admin-auth] Session present:', !!session);

    if (!session?.user?.id) {
      console.log('[admin-auth] ❌ No session');
      return {
        isAdmin: false,
        response: NextResponse.json(
          { ok: false, error: "Not authenticated" },
          { status: 401 }
        ),
      };
    }

    const userId = session.user.id;
    console.log('[admin-auth] Looking up user:', userId);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true, isAdmin: true },
    });

    console.log('[admin-auth] User found:', !!user);
    console.log('[admin-auth] User isAdmin:', user?.isAdmin);

    if (!user || !user.isAdmin) {
      console.log('[admin-auth] ❌ User is not admin');
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