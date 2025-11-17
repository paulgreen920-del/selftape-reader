import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { checkReaderOnboardingStatus } from '@/lib/onboarding-checker';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');

    if (!sessionCookie) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const session = JSON.parse(sessionCookie.value);
    const userId = session.userId;

    if (!userId) {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      );
    }

    const status = await checkReaderOnboardingStatus(userId);

    return NextResponse.json({ ok: true, status });
  } catch (error: any) {
    console.error('[/api/onboarding/status] Error:', error);
    return NextResponse.json(
      { error: 'Failed to check onboarding status' },
      { status: 500 }
    );
  }
}
