const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY!;
const RECAPTCHA_VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';

export interface RecaptchaVerifyResult {
  success: boolean;
  score: number;
  action: string;
  error?: string;
}

/**
 * Verify a reCAPTCHA token server-side
 * @param token - The token from the client
 * @param expectedAction - The action name to verify against
 * @param minScore - Minimum score to pass (0.0 to 1.0, default 0.5)
 * @returns Verification result with success status and score
 */
export async function verifyRecaptcha(
  token: string,
  expectedAction: string,
  minScore: number = 0.5
): Promise<RecaptchaVerifyResult> {
  try {
    if (!token) {
      return { success: false, score: 0, action: '', error: 'No token provided' };
    }

    if (!RECAPTCHA_SECRET_KEY) {
      console.warn('RECAPTCHA_SECRET_KEY not configured - skipping verification');
      return { success: true, score: 1, action: expectedAction };
    }

    const response = await fetch(RECAPTCHA_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: RECAPTCHA_SECRET_KEY,
        response: token,
      }),
    });

    const data = await response.json();

    /*
    Response format:
    {
      "success": true|false,
      "score": 0.0 - 1.0,  // 1.0 = very likely human
      "action": "signup",   // the action name
      "challenge_ts": "...",
      "hostname": "...",
      "error-codes": [...]  // if any
    }
    */

    if (!data.success) {
      return {
        success: false,
        score: 0,
        action: data.action || '',
        error: data['error-codes']?.join(', ') || 'Verification failed',
      };
    }

    // Check action matches
    if (data.action !== expectedAction) {
      return {
        success: false,
        score: data.score,
        action: data.action,
        error: `Action mismatch: expected ${expectedAction}, got ${data.action}`,
      };
    }

    // Check score meets minimum threshold
    if (data.score < minScore) {
      return {
        success: false,
        score: data.score,
        action: data.action,
        error: `Score ${data.score} below threshold ${minScore}`,
      };
    }

    return {
      success: true,
      score: data.score,
      action: data.action,
    };
  } catch (err: any) {
    console.error('[verifyRecaptcha] Error:', err);
    return {
      success: false,
      score: 0,
      action: '',
      error: err.message || 'Verification request failed',
    };
  }
}
