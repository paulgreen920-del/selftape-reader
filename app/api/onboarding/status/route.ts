import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-helpers';
import { checkReaderOnboardingStatus } from '@/lib/onboarding-checker';

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const userId = currentUser.id;

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
