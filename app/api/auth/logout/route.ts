import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  
  // Clear session cookie
  response.cookies.delete("session");
  
  return response;
}
