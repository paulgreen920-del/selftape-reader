import { NextRequest, NextResponse } from 'next/server';
import { verifyEmailToken } from '@/lib/email-verification';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Verification token is required' },
        { status: 400 }
      );
    }

    const result = await verifyEmailToken(token);

    if (!result.success) {
      // Show error page
      return new NextResponse(
        `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Verification Failed</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                margin: 0;
                background: #f3f4f6;
              }
              .container {
                background: white;
                padding: 40px;
                border-radius: 12px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                text-align: center;
                max-width: 500px;
              }
              h1 {
                color: #dc2626;
                margin-bottom: 16px;
              }
              p {
                color: #6b7280;
                margin-bottom: 24px;
              }
              a {
                display: inline-block;
                background: #047857;
                color: white;
                padding: 12px 24px;
                text-decoration: none;
                border-radius: 8px;
                font-weight: bold;
              }
              a:hover {
                background: #059669;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>&#10060; Verification Failed</h1>
              <p>${result.error || 'Invalid or expired verification link'}</p>
              <a href="/signup">Return to Signup</a>
            </div>
          </body>
        </html>
        `,
        { status: 400, headers: { 'Content-Type': 'text/html' } }
      );
    }

    // Determine redirect URL
    const redirectUrl =
      result.user?.role === 'READER' || result.user?.isAdmin === true
        ? '/onboarding/reader'
        : '/dashboard';

    // Create session for verified user
    const sessionData = {
      userId: result.user.id,
      email: result.user.email,
      name: result.user.name,
      role: result.user.role,
    };

    // Show success message and redirect
    const response = new NextResponse(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Email Verified!</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
              background: #f3f4f6;
            }
            .container {
              background: white;
              padding: 40px;
              border-radius: 12px;
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
              text-align: center;
              max-width: 500px;
            }
            h1 {
              color: #047857;
              margin-bottom: 16px;
            }
            p {
              color: #6b7280;
              margin-bottom: 24px;
            }
            .checkmark {
              font-size: 64px;
              margin: 24px 0;
            }
            .spinner {
              border: 3px solid #f3f4f6;
              border-top: 3px solid #047857;
              border-radius: 50%;
              width: 40px;
              height: 40px;
              animation: spin 1s linear infinite;
              margin: 24px auto;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="checkmark">&#9989;</div>
            <h1>Email Verified!</h1>
            <p>Taking you to your onboarding...</p>
            <div class="spinner"></div>
          </div>
          <script>
            // Signal any waiting tabs
            localStorage.setItem('emailVerified', 'true');

            // Redirect this tab to onboarding
            setTimeout(() => {
              window.location.href = '${redirectUrl}';
            }, 1500);
          </script>
        </body>
      </html>
      `,
      { status: 200, headers: { 'Content-Type': 'text/html' } }
    );

    // Set session cookie (logs them in as the verified user)
    response.cookies.set("session", JSON.stringify(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return response;
  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.json(
      { error: 'An error occurred during verification' },
      { status: 500 }
    );
  }
}
