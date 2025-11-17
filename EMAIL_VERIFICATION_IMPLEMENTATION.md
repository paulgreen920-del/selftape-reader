# Email Verification Implementation

## Overview
Email verification has been added to the onboarding flow. Users must verify their email address before accessing onboarding features.

## Flow

### 1. User Signs Up
- User fills out signup form at `/signup`
- Account is created with `emailVerified: false`
- Verification email is automatically sent
- User is redirected to `/verify-email` waiting page

### 2. Email Verification Waiting Page
- Shows "Check your email" message
- Polls `/api/auth/me` every 3 seconds to detect verification
- Has "Resend verification email" button
- Auto-redirects to appropriate page once verified

### 3. User Clicks Verification Link
- Link format: `https://yourdomain.com/api/auth/verify-email?token=...`
- Token is validated and user is marked as verified
- User is redirected to appropriate destination:
  - Readers: `/onboarding/{onboardingStep}` (e.g., `/onboarding/reader` or `/onboarding/schedule`)
  - Actors: `/dashboard`

### 4. Protected Onboarding Pages
- Onboarding pages check for email verification
- Redirect to `/verify-email` if not verified
- User can pick up where they left off after verification

## Files Modified

### Database Schema
- **prisma/schema.prisma**
  - Added `emailVerified Boolean @default(false)` to User model
  - Added `emailVerifiedAt DateTime?` to User model
  - Added `EmailVerification` model with token management

### Email Verification Library
- **lib/email-verification.ts** (NEW)
  - `sendVerificationEmail()` - Generates token, stores in DB, sends email via Resend
  - `verifyEmailToken()` - Validates token, marks user/token as verified

### API Endpoints
- **app/api/auth/signup/route.ts**
  - Sends verification email after user creation
  - Sets `emailVerified: false` initially

- **app/api/auth/verify-email/route.ts** (NEW)
  - GET endpoint that accepts `token` query parameter
  - Validates token and marks user as verified
  - Redirects to appropriate onboarding page

- **app/api/auth/resend-verification/route.ts** (NEW)
  - POST endpoint for resending verification email
  - Invalidates old tokens
  - Generates and sends new verification token

- **app/api/auth/me/route.ts**
  - Returns `emailVerified` and `emailVerifiedAt` fields

### Pages
- **app/signup/page.tsx**
  - Redirects to `/verify-email` after successful signup (instead of direct to onboarding)

- **app/verify-email/page.tsx** (NEW)
  - Waiting page with instructions
  - Polls for verification status
  - Resend email button
  - Auto-redirects when verified

- **app/onboarding/reader/page.tsx**
  - Checks `emailVerified` status on mount
  - Redirects to `/verify-email` if not verified

## Token Security
- Tokens are 32-byte random hex strings (64 characters)
- Tokens expire after 24 hours
- Old tokens are invalidated when requesting resend
- Tokens are marked as verified after use to prevent reuse

## Email Template
Verification emails include:
- Welcome message with user's name
- Verification link with token
- Link expires in 24 hours
- Sent from configured `FROM_EMAIL` address
- Uses Resend API

## Testing

### Local Development
Since Stripe webhooks don't fire locally, email functionality can be tested with the production environment.

### Production Testing
1. Sign up for new account
2. Check email inbox for verification email
3. Click verification link
4. Should be redirected to onboarding
5. Continue onboarding as normal

## Database Migration Status

The schema has been updated with `npx prisma db push`, which applied changes directly to the database:
- Added `emailVerified` and `emailVerifiedAt` columns to `User` table
- Created `EmailVerification` table

**Note:** The Prisma client generation encountered a file lock error. You may need to:
1. Restart VS Code to release file locks
2. Run `npx prisma generate` manually
3. This will resolve TypeScript compile errors in verification-related files

## Environment Variables Required

Ensure these are set in production:
- `FROM_EMAIL` - Verified sender email in Resend
- `RESEND_API_KEY` - Resend API key (already configured)
- `NEXT_PUBLIC_BASE_URL` - Base URL for verification links (e.g., `https://yourdomain.com`)

## Future Enhancements

Possible improvements:
- Rate limiting on resend verification endpoint
- Email change verification flow
- Custom email templates with branding
- Multi-language support for verification emails
- Admin panel to manually verify users
- Email verification reminders for unverified accounts
