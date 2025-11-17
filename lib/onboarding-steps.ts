/**
 * Onboarding step order and validation
 */

export const ONBOARDING_STEPS = {
  PROFILE: 'profile',      // Step 1-2: Basic info + headshot
  SCHEDULE: 'schedule',    // Step 3: Calendar sync
  AVAILABILITY: 'availability', // Step 4: Set availability templates
  PAYMENT: 'payment',      // Step 5: Stripe Connect
  SUBSCRIBE: 'subscribe',  // Step 6: Subscribe
  COMPLETE: null,          // Onboarding finished
} as const;

export type OnboardingStep = typeof ONBOARDING_STEPS[keyof typeof ONBOARDING_STEPS];

const STEP_ORDER = [
  ONBOARDING_STEPS.PROFILE,
  ONBOARDING_STEPS.SCHEDULE,
  ONBOARDING_STEPS.AVAILABILITY,
  ONBOARDING_STEPS.PAYMENT,
  ONBOARDING_STEPS.SUBSCRIBE,
  ONBOARDING_STEPS.COMPLETE,
];

/**
 * Check if currentStep is at or after the requiredStep
 * Returns true if user should be allowed on the page
 */
export function isStepAllowed(currentStep: OnboardingStep, requiredStep: OnboardingStep): boolean {
  if (currentStep === null) return true; // Completed users can access anything
  
  const currentIndex = STEP_ORDER.indexOf(currentStep);
  const requiredIndex = STEP_ORDER.indexOf(requiredStep);
  
  return currentIndex >= requiredIndex;
}

/**
 * Get the URL for a given onboarding step
 */
export function getStepUrl(step: OnboardingStep, readerId: string): string {
  if (step === null) return '/dashboard';
  
  const stepRoutes = {
    [ONBOARDING_STEPS.PROFILE]: `/onboarding/profile?readerId=${readerId}`,
    [ONBOARDING_STEPS.SCHEDULE]: `/onboarding/schedule?readerId=${readerId}`,
    [ONBOARDING_STEPS.AVAILABILITY]: `/onboarding/availability?readerId=${readerId}`,
    [ONBOARDING_STEPS.PAYMENT]: `/onboarding/payment?readerId=${readerId}`,
    [ONBOARDING_STEPS.SUBSCRIBE]: `/onboarding/subscribe?readerId=${readerId}`,
  };
  
  return stepRoutes[step] || '/dashboard';
}
