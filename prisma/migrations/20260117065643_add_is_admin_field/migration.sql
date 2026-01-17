-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELED', 'NO_SHOW', 'RESCHEDULED');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('NONE', 'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'PARTIAL');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ACTOR', 'READER', 'ADMIN');

-- CreateTable
CREATE TABLE "ICalConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ICalConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvailabilitySlot" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "bookingId" TEXT,
    "endTime" TIMESTAMP(3) NOT NULL,
    "isBooked" BOOLEAN NOT NULL DEFAULT false,
    "startTime" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "AvailabilitySlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvailabilityTemplate" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "AvailabilityTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "readerId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "meetingUrl" TEXT,
    "notes" TEXT,
    "actorId" TEXT NOT NULL,
    "cancelReason" TEXT,
    "canceledAt" TIMESTAMP(3),
    "durationMinutes" INTEGER NOT NULL,
    "platformFeeCents" INTEGER,
    "readerEarningsCents" INTEGER,
    "stripePaymentIntentId" TEXT,
    "stripeTransferId" TEXT,
    "totalCents" INTEGER NOT NULL,
    "sidesFileName" TEXT,
    "sidesLink" TEXT,
    "sidesUrl" TEXT,
    "actorJoinedAt" TIMESTAMP(3),
    "canceledBy" TEXT,
    "hasIssue" BOOLEAN NOT NULL DEFAULT false,
    "issueDescription" TEXT,
    "issueReportedBy" TEXT,
    "issueResolution" TEXT,
    "issueResolvedAt" TIMESTAMP(3),
    "issueType" TEXT,
    "platformCreditCents" INTEGER,
    "processingFeeCents" INTEGER,
    "readerJoinedAt" TIMESTAMP(3),
    "refundCents" INTEGER,
    "refundIssuedAt" TIMESTAMP(3),
    "refundStatus" "RefundStatus",
    "sessionDuration" INTEGER,
    "sessionEndedAt" TIMESTAMP(3),
    "sessionStartedAt" TIMESTAMP(3),
    "stripeRefundId" TEXT,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarConnection" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "email" TEXT,
    "calendarId" TEXT,

    CONSTRAINT "CalendarConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerifiedAt" TIMESTAMP(3),
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'ACTOR',
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "displayName" TEXT,
    "phone" TEXT,
    "timezone" TEXT DEFAULT 'America/New_York',
    "city" TEXT,
    "bio" TEXT,
    "playableAgeMin" INTEGER,
    "playableAgeMax" INTEGER,
    "gender" TEXT,
    "headshotUrl" TEXT,
    "ratePer15Min" INTEGER DEFAULT 1500,
    "ratePer30Min" INTEGER DEFAULT 2500,
    "ratePer60Min" INTEGER DEFAULT 6000,
    "unions" JSONB DEFAULT '[]',
    "languages" JSONB DEFAULT '[]',
    "specialties" JSONB DEFAULT '[]',
    "links" JSONB DEFAULT '[]',
    "subscriptionId" TEXT,
    "subscriptionStatus" TEXT DEFAULT 'inactive',
    "stripeAccountId" TEXT,
    "stripeCustomerId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "acceptsTerms" BOOLEAN NOT NULL DEFAULT false,
    "marketingOptIn" BOOLEAN NOT NULL DEFAULT false,
    "onboardingStep" TEXT,
    "bookingBuffer" INTEGER DEFAULT 15,
    "maxAdvanceBooking" INTEGER DEFAULT 360,
    "minAdvanceHours" INTEGER DEFAULT 2,
    "canceledSessions" INTEGER NOT NULL DEFAULT 0,
    "completedSessions" INTEGER NOT NULL DEFAULT 0,
    "lastWarningAt" TIMESTAMP(3),
    "lateArrivals" INTEGER NOT NULL DEFAULT 0,
    "noShowSessions" INTEGER NOT NULL DEFAULT 0,
    "reliabilityScore" DOUBLE PRECISION,
    "suspendedUntil" TIMESTAMP(3),
    "suspensionReason" TEXT,
    "totalSessions" INTEGER NOT NULL DEFAULT 0,
    "skippedOnboardingSteps" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_change_requests" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "oldEmail" TEXT NOT NULL,
    "newEmail" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_change_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailVerification" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),

    CONSTRAINT "EmailVerification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ICalConnection_userId_idx" ON "ICalConnection"("userId");

-- CreateIndex
CREATE INDEX "AvailabilitySlot_isBooked_idx" ON "AvailabilitySlot"("isBooked");

-- CreateIndex
CREATE INDEX "AvailabilitySlot_startTime_idx" ON "AvailabilitySlot"("startTime");

-- CreateIndex
CREATE INDEX "AvailabilitySlot_userId_idx" ON "AvailabilitySlot"("userId");

-- CreateIndex
CREATE INDEX "AvailabilitySlot_userId_startTime_idx" ON "AvailabilitySlot"("userId", "startTime");

-- CreateIndex
CREATE INDEX "AvailabilityTemplate_dayOfWeek_idx" ON "AvailabilityTemplate"("dayOfWeek");

-- CreateIndex
CREATE INDEX "AvailabilityTemplate_userId_idx" ON "AvailabilityTemplate"("userId");

-- CreateIndex
CREATE INDEX "Booking_actorId_idx" ON "Booking"("actorId");

-- CreateIndex
CREATE INDEX "Booking_readerId_idx" ON "Booking"("readerId");

-- CreateIndex
CREATE INDEX "Booking_startTime_idx" ON "Booking"("startTime");

-- CreateIndex
CREATE INDEX "Booking_status_idx" ON "Booking"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarConnection_userId_key" ON "CalendarConnection"("userId");

-- CreateIndex
CREATE INDEX "CalendarConnection_userId_idx" ON "CalendarConnection"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE INDEX "PasswordResetToken_token_idx" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_isActive_idx" ON "User"("isActive");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "email_change_requests_token_key" ON "email_change_requests"("token");

-- CreateIndex
CREATE INDEX "email_change_requests_token_idx" ON "email_change_requests"("token");

-- CreateIndex
CREATE INDEX "email_change_requests_userId_idx" ON "email_change_requests"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailVerification_token_key" ON "EmailVerification"("token");

-- CreateIndex
CREATE INDEX "EmailVerification_email_idx" ON "EmailVerification"("email");

-- CreateIndex
CREATE INDEX "EmailVerification_token_idx" ON "EmailVerification"("token");

-- AddForeignKey
ALTER TABLE "ICalConnection" ADD CONSTRAINT "ICalConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilitySlot" ADD CONSTRAINT "AvailabilitySlot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityTemplate" ADD CONSTRAINT "AvailabilityTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_readerId_fkey" FOREIGN KEY ("readerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarConnection" ADD CONSTRAINT "CalendarConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_change_requests" ADD CONSTRAINT "email_change_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
