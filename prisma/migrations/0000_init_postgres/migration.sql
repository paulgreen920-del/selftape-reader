-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'PAID', 'CANCELED', 'COMPLETED');

-- CreateTable
CREATE TABLE "Reader" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "displayName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "headshotUrl" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "city" TEXT,
    "bio" TEXT,
    "ratePer15Min" INTEGER NOT NULL DEFAULT 1500,
    "ratePer30Min" INTEGER NOT NULL DEFAULT 2500,
    "ratePer60Min" INTEGER NOT NULL DEFAULT 6000,
    "unions" JSONB NOT NULL DEFAULT '[]',
    "languages" JSONB NOT NULL DEFAULT '[]',
    "specialties" JSONB NOT NULL DEFAULT '[]',
    "links" JSONB NOT NULL DEFAULT '[]',
    "acceptsTerms" BOOLEAN NOT NULL DEFAULT false,
    "marketingOptIn" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "stripeAccountId" TEXT,

    CONSTRAINT "Reader_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvailabilitySlot" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startMin" INTEGER NOT NULL,
    "endMin" INTEGER NOT NULL,
    "readerId" TEXT NOT NULL,

    CONSTRAINT "AvailabilitySlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "actorName" TEXT NOT NULL,
    "actorEmail" TEXT NOT NULL,
    "actorTimezone" TEXT NOT NULL DEFAULT 'UTC',
    "readerId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "durationMin" INTEGER NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "meetingUrl" TEXT,
    "notes" TEXT,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Reader_email_key" ON "Reader"("email");

-- CreateIndex
CREATE INDEX "Reader_email_idx" ON "Reader"("email");

-- CreateIndex
CREATE INDEX "AvailabilitySlot_readerId_dayOfWeek_idx" ON "AvailabilitySlot"("readerId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "Booking_readerId_startTime_idx" ON "Booking"("readerId", "startTime");

-- CreateIndex
CREATE INDEX "Booking_actorEmail_idx" ON "Booking"("actorEmail");

-- AddForeignKey
ALTER TABLE "AvailabilitySlot" ADD CONSTRAINT "AvailabilitySlot_readerId_fkey" FOREIGN KEY ("readerId") REFERENCES "Reader"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_readerId_fkey" FOREIGN KEY ("readerId") REFERENCES "Reader"("id") ON DELETE CASCADE ON UPDATE CASCADE;

