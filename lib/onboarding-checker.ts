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
  isComplete: boolean;
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

  if (!user || user.role !== 'READER') {
    return {
      currentStep: 'account-created',
      completedSteps: [],
      isComplete: false,
      nextStepUrl: null,
      canAccessDashboard: false,
    };
  }

  const completedSteps: OnboardingStep[] = ['account-created'];
  let currentStep: OnboardingStep = 'email-verified';
  let nextStepUrl: string | null = '/verify-email';

  // Step 2: Email verified
  if (user.emailVerified) {
    completedSteps.push('email-verified');
    currentStep = 'profile-completed';
    nextStepUrl = '/onboarding/reader';
  } else {
    return {
      currentStep: 'email-verified',
      completedSteps,
      isComplete: false,
      nextStepUrl: '/verify-email',
      canAccessDashboard: false,
    };
  }

  // Step 3: Profile completed (headshot, phone, bio, age, gender, rates, etc.)
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
    currentStep = 'calendar-connected';
    nextStepUrl = `/onboarding/schedule?readerId=${userId}`;
  } else {
    return {
      currentStep: 'profile-completed',
      completedSteps,
      isComplete: false,
      nextStepUrl: '/onboarding/reader',
      canAccessDashboard: false,
    };
  }

  // Step 4: Calendar connected
  if (user.CalendarConnection) {
    completedSteps.push('calendar-connected');
    currentStep = 'availability-set';
    nextStepUrl = `/onboarding/availability?readerId=${userId}`;
  } else {
    return {
      currentStep: 'calendar-connected',
      completedSteps,
      isComplete: false,
      nextStepUrl: `/onboarding/schedule?readerId=${userId}`,
      canAccessDashboard: false,
    };
  }

  // Step 5: Availability templates set
  const hasAvailability = user.AvailabilityTemplate && user.AvailabilityTemplate.length > 0;
  if (hasAvailability) {
    completedSteps.push('availability-set');
    currentStep = 'stripe-connected';
    nextStepUrl = `/onboarding/payment?readerId=${userId}`;
  } else {
    // If they've already paid, let them access dashboard but mark availability as incomplete
    if (user.stripeAccountId || user.subscriptionStatus === 'active') {
      currentStep = 'availability-set';
      nextStepUrl = `/onboarding/availability?readerId=${userId}`;
      // Continue to next checks instead of returning
    } else {
      return {
        currentStep: 'availability-set',
        completedSteps,
        isComplete: false,
        nextStepUrl: `/onboarding/availability?readerId=${userId}`,
        canAccessDashboard: false,
      };
    }
  }

  // Step 6: Stripe Connected
  if (user.stripeAccountId) {
    completedSteps.push('stripe-connected');
    currentStep = 'subscription-active';
    nextStepUrl = `/onboarding/subscribe?readerId=${userId}`;
  } else {
    return {
      currentStep: 'stripe-connected',
      completedSteps,
      isComplete: false,
      nextStepUrl: `/onboarding/payment?readerId=${userId}`,
      canAccessDashboard: false,
    };
  }

  // Step 7: Subscription active
  const hasActiveSubscription = user.subscriptionStatus === 'active';
  if (hasActiveSubscription) {
    completedSteps.push('subscription-active');
    
    // If subscription is active, allow dashboard access even if some steps incomplete
    const allStepsComplete = hasAvailability;
    
    return {
      currentStep: allStepsComplete ? 'completed' : currentStep,
      completedSteps: allStepsComplete ? [...completedSteps, 'completed'] : completedSteps,
      isComplete: allStepsComplete,
      nextStepUrl: allStepsComplete ? null : nextStepUrl,
      canAccessDashboard: true, // Always allow if subscription active
    };
  }

  return {
    currentStep: 'subscription-active',
    completedSteps,
    isComplete: false,
    nextStepUrl: `/onboarding/subscribe?readerId=${userId}`,
    canAccessDashboard: false,
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
