"use client";

import { useCallback, useEffect } from 'react';

declare global {
  interface Window {
    grecaptcha: {
      ready: (cb: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!;

export function useRecaptcha() {
  useEffect(() => {
    // Load the reCAPTCHA script if not already loaded
    if (typeof window !== 'undefined' && !document.querySelector('#recaptcha-script')) {
      const script = document.createElement('script');
      script.id = 'recaptcha-script';
      script.src = `https://www.google.com/recaptcha/api.js?render=${SITE_KEY}`;
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  const getToken = useCallback(async (action: string): Promise<string | null> => {
    try {
      if (typeof window === 'undefined' || !window.grecaptcha) {
        console.warn('reCAPTCHA not loaded');
        return null;
      }

      return new Promise((resolve) => {
        window.grecaptcha.ready(async () => {
          try {
            const token = await window.grecaptcha.execute(SITE_KEY, { action });
            resolve(token);
          } catch (err) {
            console.error('reCAPTCHA execute error:', err);
            resolve(null);
          }
        });
      });
    } catch (err) {
      console.error('reCAPTCHA error:', err);
      return null;
    }
  }, []);

  return { getToken };
}
