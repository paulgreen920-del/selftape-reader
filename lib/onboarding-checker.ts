import { prisma } from './prisma';

export type OnboardingStep = 
  | 'account-created'      // Step 1: Account created with name, email, password
  | 'email-verified'       // Step 2: Email verified
  | 'profile-completed'    // Step 3: Profile info, headshot, phone, age, etc.
  | 'calendar-connected'   // Step 4: Calendar connected
  | 'availability-set'     // Step 5: Availability templates set
  | 'stripe-connected'     // Step 6: Stripe Connect account
  | 'subscription-active'  // Step 7: Subscription purchase completed
  | 'completed';

export interface OnboardingStatus {
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  isComplete: boolean; // All steps complete
  isFullyOnboarded: boolean; // True only if all steps are done and none skipped
  nextStepUrl: string | null;
  canAccessDashboard: boolean;
}

export async function checkReaderOnboardingStatus(userId: string): Promise<OnboardingStatus> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      CalendarConnection: true,
      AvailabilityTemplate: true,
    }
  });

  // Treat ADMINs exactly as READERs for onboarding logic
  if (!user || (user.role !== 'READER' && user.role !== 'ADMIN')) {
    return {
      currentStep: 'account-created',
      completedSteps: [],
      isComplete: false,
      isFullyOnboarded: false,
      nextStepUrl: null,
      canAccessDashboard: false,
    };
  }

  // --- INDEPENDENT ONBOARDING STEPS LOGIC ---
  // Each step is independent: once completed, always completed
  // Steps: account-created, email-verified, profile-completed, calendar-connected, availability-set, stripe-connected, subscription-active
  const completedSteps: OnboardingStep[] = ['account-created'];
  let currentStep: OnboardingStep = 'account-created';
  let nextStepUrl: string | null = null;

  // Step 2: Email verified
  if (user.emailVerified) {
    completedSteps.push('email-verified');
  } else {
    if (!nextStepUrl) nextStepUrl = '/verify-email';
    if (currentStep === 'account-created') currentStep = 'email-verified';
  }

  // Step 3: Profile completed
  const hasProfileInfo = !!(
    user.headshotUrl &&
    user.phone &&
    user.bio &&
    user.playableAgeMin !== null &&
    user.playableAgeMax !== null &&
    user.gender &&
    user.ratePer15Min &&
    user.ratePer30Min &&
    user.ratePer60Min
  );
  if (hasProfileInfo) {
    completedSteps.push('profile-completed');
  } else {
    if (!nextStepUrl) nextStepUrl = '/onboarding/reader';
    if (currentStep === 'account-created' || currentStep === 'email-verified') currentStep = 'profile-completed';
  }

  // Step 4: Calendar connected
  if (user.CalendarConnection) {
    completedSteps.push('calendar-connected');
  } else {
    if (!nextStepUrl) nextStepUrl = `/onboarding/schedule?readerId=${userId}`;
    if (['account-created','email-verified','profile-completed'].includes(currentStep)) currentStep = 'calendar-connected';
  }

  // Step 5: Availability templates set
  const hasAvailability = user.AvailabilityTemplate && user.AvailabilityTemplate.length > 0;
  if (hasAvailability) {
    completedSteps.push('availability-set');
  } else {
    if (!nextStepUrl) nextStepUrl = `/onboarding/availability?readerId=${userId}`;
    if (['account-created','email-verified','profile-completed','calendar-connected'].includes(currentStep)) currentStep = 'availability-set';
  }

  // Step 6: Stripe Connected
  if (user.stripeAccountId) {
    completedSteps.push('stripe-connected');
  } else {
    if (!nextStepUrl) nextStepUrl = `/onboarding/payment?readerId=${userId}`;
    if (['account-created','email-verified','profile-completed','calendar-connected','availability-set'].includes(currentStep)) currentStep = 'stripe-connected';
  }

  // Step 7: Subscription active
  const hasActiveSubscription = user.subscriptionStatus === 'active';
  if (hasActiveSubscription) {
    completedSteps.push('subscription-active');
  } else {
    if (!nextStepUrl) nextStepUrl = `/onboarding/subscribe?readerId=${userId}`;
    if (['account-created','email-verified','profile-completed','calendar-connected','availability-set','stripe-connected'].includes(currentStep)) currentStep = 'subscription-active';
  }

  // All steps complete?
  const allStepsComplete = completedSteps.length === 7;
  if (allStepsComplete) {
    currentStep = 'completed';
    nextStepUrl = null;
  }

  // Allow dashboard access if at least one step is complete (after account creation)
  // Block only if user hasn't verified email or completed profile
  let canAccessDashboard = true;
  if (!user.emailVerified || !hasProfileInfo) {
    canAccessDashboard = false;
  }

  return {
    currentStep,
    completedSteps: allStepsComplete ? [...completedSteps, 'completed'] : completedSteps,
    isComplete: allStepsComplete,
    isFullyOnboarded: allStepsComplete,
    nextStepUrl,
    canAccessDashboard,
  };
}

export function getStepName(step: OnboardingStep): string {
  const names: Record<OnboardingStep, string> = {
    'account-created': 'Create Account',
    'email-verified': 'Verify Email',
    'profile-completed': 'Complete Profile',
    'calendar-connected': 'Connect Calendar',
    'availability-set': 'Set Availability',
    'stripe-connected': 'Connect Payment',
    'subscription-active': 'Activate Subscription',
    'completed': 'Completed',
  };
  return names[step];
}
