# Cancellation Policy & Refund System Implementation

## Overview
Comprehensive cancellation, refund, and reliability tracking system implemented across the Self-Tape Reader platform.

---

## ✅ COMPLETED FEATURES

### 1. Database Schema Updates (`prisma/schema.prisma`)

**Booking Model Enhancements:**
- Added `canceledBy` (ACTOR/READER/PLATFORM/SYSTEM)
- Added `refundStatus` enum (NONE, PENDING, PROCESSING, COMPLETED, FAILED, PARTIAL)
- Added `refundCents`, `refundIssuedAt`, `processingFeeCents`, `platformCreditCents`
- Added `stripeRefundId` for Stripe refund tracking
- Added session tracking: `readerJoinedAt`, `actorJoinedAt`, `sessionStartedAt`, `sessionEndedAt`, `sessionDuration`
- Added issue tracking: `hasIssue`, `issueType`, `issueReportedBy`, `issueDescription`, `issueResolvedAt`, `issueResolution`
- Added new booking statuses: `RESCHEDULED`, `NO_SHOW`

**User Model Enhancements (Reader Reliability):**
- Added `totalSessions`, `completedSessions`, `canceledSessions`, `noShowSessions`, `lateArrivals`
- Added `reliabilityScore` (0-100 calculated score)
- Added `lastWarningAt`, `suspendedUntil`, `suspensionReason`

**Database Status:**
✅ Schema pushed to database successfully
⚠️ Prisma client needs regeneration (restart dev server to clear file locks)

---

### 2. Cancellation Policy (Terms of Service)

**File:** `app/terms/page.tsx`

**Comprehensive Policy Added:**

#### Actor Cancellations:
- **2+ hours notice:** Full refund minus ~$2 processing fee
- **Under 2 hours:** No refund, reader gets full payment
- **No-show:** No refund, reader gets full payment

#### Reader Cancellations:
- **24+ hours notice:** Full refund to actor, no penalty
- **Under 24 hours:** Full refund to actor + warning to reader
- **No-show:** Full refund + $5-10 credit to actor + 14-day suspension for reader
- **Late 5+ min:** Session auto-extends at no cost to actor

#### Technical Issues:
- **Platform failure:** Full refund or free reschedule
- **Actor's tech issues:** No refund (actor responsibility)
- **Reader's tech issues:** Partial/full refund based on severity

#### Reader Reliability Standards:
- 95%+ attendance rate required
- No more than 1 late cancellation per month
- Zero tolerance for no-shows
- Reliability score affects search visibility

---

### 3. API Endpoints Created

#### POST `/api/bookings/cancel`
**Purpose:** Cancel bookings with automatic refund calculation

**Request:**
```json
{
  "bookingId": "string",
  "canceledBy": "ACTOR" | "READER" | "PLATFORM" | "SYSTEM",
  "reason": "string (optional)"
}
```

**Features:**
- Validates cancellation time windows
- Calculates refund based on policy rules
- Processes Stripe refunds automatically
- Updates reader reliability metrics
- Checks for suspension thresholds (3+ cancellations in 30 days)
- Calculates and updates reliability scores

**Refund Logic:**
- Actor 2+ hours: totalCents - processingFee (~$2)
- Actor < 2 hours: $0 refund, reader paid
- Reader 24+ hours: Full refund, no penalty
- Reader < 24 hours: Full refund + reader warning
- Platform issue: Full refund + $5 credit

---

#### POST `/api/bookings/reschedule`
**Purpose:** Reschedule bookings with time window validation

**Request:**
```json
{
  "bookingId": "string",
  "newDate": "YYYY-MM-DD",
  "newStartMin": number,
  "requestedBy": "ACTOR" | "READER"
}
```

**Features:**
- Actor: Must reschedule 2+ hours before
- Reader: Must reschedule 24+ hours before (or face penalties)
- Validates new time is in future (respects min advance hours)
- Validates new time within max advance booking window
- Checks reader availability at new time
- Prevents overlapping bookings
- Stores reschedule history in notes

---

#### POST `/api/bookings/report-issue`
**Purpose:** Report session issues (no-shows, late arrivals, technical problems)

**Request:**
```json
{
  "bookingId": "string",
  "reportedBy": "ACTOR" | "READER",
  "issueType": "NO_SHOW" | "LATE" | "TECHNICAL" | "CONDUCT" | "OTHER",
  "description": "string (optional)"
}
```

**Automatic Actions:**
- **Reader no-show:** 14-day suspension + full refund + $5 credit
- **Actor no-show:** Reader gets paid, recorded in system
- **Reader late:** Late arrival counter incremented, extends session
- **Technical issues:** Flags for support review

**Reader Metrics Updated:**
- `noShowSessions`, `lateArrivals` incremented
- `reliabilityScore` recalculated
- Suspension applied if warranted

---

#### GET `/api/bookings/[id]`
**Purpose:** Fetch single booking details for cancel/reschedule pages

**Response:**
```json
{
  "ok": true,
  "booking": {
    "id": "string",
    "startTime": "ISO date",
    "endTime": "ISO date",
    "status": "string",
    "reader": { "displayName": "...", "email": "..." },
    "actor": { "name": "...", "email": "..." },
    "totalCents": number,
    "durationMinutes": number
  }
}
```

---

### 4. Email Updates

**File:** `lib/send-booking-confirmation.ts`

**Actor Email Enhancements:**
- Added cancellation policy summary box with color-coded notice
- Cancel button (red) and Reschedule button (blue)
- Direct links to `/bookings/[id]/cancel`, `/bookings/[id]/reschedule`
- "Report Issue" link added
- Policy highlights:
  - Cancel 2+ hours: Full refund minus ~$2
  - Cancel < 2 hours: No refund
  - Reschedule: Free up to 2 hours before
  - No-show: No refund

**Reader Email Enhancements:**
- Prominent warning box about cancellation penalties
- Reliability score impact mentioned
- Suspension thresholds communicated
- Policy highlights:
  - Cancel 24+ hours: No penalty
  - Cancel < 24 hours: Warning + actor refund
  - No-show: 14-day suspension
  - Late 5+ min: Session extends

**Both Emails Include:**
- Cancel and Reschedule action buttons
- Report Issue link
- Calendar add links (Google, Outlook)
- Meeting URLs
- Audition sides (if uploaded)

---

### 5. Calendar Integration

**File:** `app/api/calendar/ical/[readerId]/route.ts`

**Event Description Enhancements:**
- Cancel link: Direct URL to cancellation page
- Reschedule link: Direct URL to reschedule page
- Report link: Direct URL to issue reporting
- Policy summary embedded in event:
  ```
  --- CANCELLATION POLICY ---
  • Cancel 24+ hours: No penalty
  • Cancel under 24 hours: Warning + refund to actor
  • No-show: 14-day suspension
  • Late 5+ min: Session auto-extends
  ```

---

### 6. User Interface Pages

#### Cancel Booking Page
**File:** `app/bookings/[bookingId]/cancel/page.tsx`

**Features:**
- Displays session details
- Shows refund eligibility based on time remaining
- Color-coded warning:
  - Blue box: 2+ hours (full refund)
  - Red box: < 2 hours (no refund)
- Calculates hours until session
- Optional cancellation reason textarea
- Confirmation dialog
- Success page with refund breakdown
- Auto-redirects to bookings after 5 seconds

**Refund Display:**
- Shows refund amount
- Shows processing fee deduction
- Shows platform credit (if applicable)
- Processing time notice (5-10 business days)

---

### 7. Help Page Updates

**File:** `app/help/page.tsx`

**New FAQ Sections:**
- "Can I cancel or reschedule a session?" - Quick reference with time windows
- "What is the cancellation policy?" - Complete breakdown for actors and readers
- "What if there's a technical issue?" - Technical failure scenarios
- "How do I report a no-show or other issue?" - Reporting instructions

**Actor Policy Summary:**
- 2+ hours: Full refund minus fee
- < 2 hours: No refund
- No-show: No refund

**Reader Policy Summary:**
- 24+ hours: No penalty
- < 24 hours: Warning
- No-show: Suspension
- Late: Auto-extend

---

## 🔧 TECHNICAL IMPLEMENTATION DETAILS

### Reliability Score Calculation
```typescript
completionRate = (completedSessions / totalSessions) * 100
cancelPenalty = (canceledSessions / totalSessions) * 20
noShowPenalty = (noShowSessions / totalSessions) * 50
latePenalty = (lateArrivals / totalSessions) * 10

reliabilityScore = max(0, min(100, completionRate - cancelPenalty - noShowPenalty - latePenalty))
```

### Suspension Logic
- **Immediate suspension (14 days):** Any no-show
- **Progressive suspension (7 days):** 3+ late cancellations in 30 days
- Suspensions stored in `suspendedUntil` field
- Reason stored in `suspensionReason`

### Stripe Refund Processing
```typescript
const refund = await stripe.refunds.create({
  payment_intent: booking.stripePaymentIntentId,
  amount: refundAmount,
  reason: "requested_by_customer",
  metadata: {
    bookingId,
    canceledBy,
    originalAmount,
    processingFee
  }
});
```

---

## 📋 NEXT STEPS (To Complete System)

### 1. **Restart Dev Server** (CRITICAL)
The Prisma client is locked and needs regeneration:
```bash
# Stop dev server (Ctrl+C)
npx prisma generate
npm run dev
```

### 2. **Create Reschedule UI Page**
File: `app/bookings/[bookingId]/reschedule/page.tsx`
- Date/time picker
- Reader availability check
- Time window validation
- Confirmation flow

### 3. **Create Report Issue UI Page**
File: `app/bookings/[bookingId]/report/page.tsx`
- Issue type selector
- Description textarea
- Evidence upload (optional)
- Submit to support team

### 4. **Create Bookings Dashboard**
File: `app/bookings/page.tsx`
- List all user bookings
- Filter by status
- Quick actions (cancel, reschedule, report)
- Upcoming vs past sessions

### 5. **Implement Email Notifications**
- Cancellation confirmation emails (both parties)
- Reschedule confirmation emails (both parties)
- Issue report confirmation
- Suspension notice emails (readers)
- Warning emails (readers)

### 6. **Add Session Confirmation System**
- Both parties confirm attendance (pre-session)
- Track actual join times
- Auto-detect no-shows
- Calculate actual session duration

### 7. **Reader Dashboard Enhancements**
Display on reader profile:
- Reliability score badge
- Total sessions completed
- Response rate
- On-time rate
- Suspension status (if applicable)

### 8. **Admin Dashboard** (Future)
- Review reported issues
- Manual refund processing
- Reader suspension management
- Dispute resolution tools
- Analytics dashboard

### 9. **Automated Reminders**
- 24-hour before session
- 2-hour before session
- Reader reliability reminders
- Cancellation deadline notices

### 10. **Testing**
- Test all refund scenarios
- Test time window validations
- Test suspension triggers
- Test email deliveries
- Test calendar link generation

---

## 📊 POLICY ENFORCEMENT SUMMARY

| Scenario | Time Window | Refund to Actor | Reader Penalty | Platform Action |
|----------|-------------|-----------------|----------------|-----------------|
| Actor cancels | 2+ hours | Full - ~$2 fee | None | Process refund |
| Actor cancels | < 2 hours | None | None | Pay reader |
| Actor no-show | N/A | None | None | Pay reader |
| Reader cancels | 24+ hours | Full | None | Process refund |
| Reader cancels | < 24 hours | Full | Warning | Process refund + warn |
| Reader no-show | N/A | Full + $5 credit | 14-day suspension | Refund + suspend |
| Reader late | 5+ min | None | Track in score | Auto-extend session |
| Platform fail | N/A | Full or reschedule | None | Refund/reschedule |
| Actor tech issue | N/A | None | None | Pay reader |
| Reader tech issue | N/A | Partial/Full | Track in score | Review case |

---

## 🎯 POLICY GOALS ACHIEVED

✅ **Clear refund rules** - Time-based, automated
✅ **Reader accountability** - Reliability tracking, suspensions
✅ **Actor protection** - Generous refund windows, credits for issues
✅ **Automated enforcement** - APIs handle all logic
✅ **Transparent communication** - Policy in emails, calendar, help docs
✅ **Dispute system** - Issue reporting with automatic actions
✅ **Quality maintenance** - 95%+ attendance requirement
✅ **Fair penalties** - Graduated warnings, suspension thresholds

---

## 🔗 KEY URLS

- **Terms of Service:** `/terms` (comprehensive policy)
- **Help/FAQ:** `/help` (user-friendly summaries)
- **Cancel Booking:** `/bookings/[id]/cancel`
- **Reschedule:** `/bookings/[id]/reschedule` (TO BE BUILT)
- **Report Issue:** `/bookings/[id]/report` (TO BE BUILT)
- **Bookings List:** `/bookings` (TO BE BUILT)

---

## 📧 SUPPORT CONTACTS

- **Email:** support@selftapereader.com
- **Legal:** legal@selftapereader.com
- **Booking:** booking@selftapereader.com

---

## ⚠️ IMPORTANT NOTES

1. **Prisma Client:** Must regenerate after restarting dev server
2. **Stripe Webhook:** Ensure webhook handles refund events
3. **Email Service:** Resend API key must be configured
4. **Time Zones:** All times stored in UTC, displayed in user timezone
5. **Processing Fees:** Stripe charges ~2.9% + $0.30 per transaction
6. **Platform Credits:** Stored in `platformCreditCents`, applied to future bookings
7. **Reliability Score:** Recalculated after every booking event
8. **Suspension:** Prevents new bookings but must honor existing ones

---

## 🚀 DEPLOYMENT CHECKLIST

Before going live with this system:

- [ ] Test cancellation flow (2+ hours scenario)
- [ ] Test cancellation flow (< 2 hours scenario)
- [ ] Test reader no-show scenario
- [ ] Test reschedule flow
- [ ] Test issue reporting
- [ ] Verify Stripe refunds process correctly
- [ ] Test email delivery for all scenarios
- [ ] Test calendar links work
- [ ] Verify suspension logic triggers correctly
- [ ] Test reliability score calculations
- [ ] Review all policy wording with legal team
- [ ] Set up monitoring for failed refunds
- [ ] Create admin tools for manual intervention
- [ ] Train support team on dispute resolution
- [ ] Prepare customer communication plan

---

## 📝 CHANGELOG

**November 14, 2025**
- ✅ Updated Prisma schema with cancellation/refund/reliability fields
- ✅ Created comprehensive cancellation policy in Terms of Service
- ✅ Implemented `/api/bookings/cancel` with automatic refund logic
- ✅ Implemented `/api/bookings/reschedule` with time window validation
- ✅ Implemented `/api/bookings/report-issue` with automatic penalties
- ✅ Updated booking confirmation emails with policy and action links
- ✅ Updated calendar events with cancel/reschedule links
- ✅ Created cancel booking UI page
- ✅ Updated help page with comprehensive FAQ
- ✅ Created GET `/api/bookings/[id]` endpoint

**Status:** Core system complete, UI pages and testing remain.
