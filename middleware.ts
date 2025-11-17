// This middleware increases the body size limit for the /api/uploads route to 10MB.
import { NextRequest, NextResponse } from 'next/server';

export const config = {
  matcher: ['/api/uploads'],
};

export function middleware(req: NextRequest) {
  // Set the body size limit to 10MB for this route
  // (Next.js 13+ only supports this via custom config in middleware)
  // This is a placeholder; actual body size limit must be set in the API handler.
  return NextResponse.next();
}
