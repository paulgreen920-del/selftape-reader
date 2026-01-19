import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * Get the current authenticated user from the session.
 * Use this in API routes to check authentication.
 * 
 * @example
 * const user = await getCurrentUser();
 * if (!user) {
 *   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 * }
 */
export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  return session?.user ?? null;
}

/**
 * Check if the current user is an admin.
 */
export async function isAdmin() {
  const user = await getCurrentUser();
  return user?.isAdmin ?? false;
}

/**
 * Check if the current user is a reader.
 */
export async function isReader() {
  const user = await getCurrentUser();
  return user?.role === "READER";
}