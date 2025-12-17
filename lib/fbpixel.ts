export const trackEvent = (eventName: string, params?: object) => {
  if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
    window.fbq('track', eventName, params);
  }
};

// Pre-built events
export const trackSignUpClick = () => trackEvent('InitiateCheckout');
export const trackSignUpComplete = (role?: string) => trackEvent('CompleteRegistration', { content_name: role });
export const trackBookingComplete = (value?: number) => trackEvent('Purchase', { value, currency: 'USD' });
