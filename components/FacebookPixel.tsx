'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    fbq: any;
    _fbq: any;
  }
}

const FB_PIXEL_ID = '918220014962169';

export default function FacebookPixel() {
  const pathname = usePathname();

  // Initialize pixel on first load
  useEffect(() => {
    if (window.fbq) return; // Already initialized

    const f = window;
    const b = document;
    const n: any = (f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    });
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = '2.0';
    n.queue = [];

    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://connect.facebook.net/en_US/fbevents.js';
    document.head.appendChild(script);

    window.fbq('init', FB_PIXEL_ID);
    window.fbq('track', 'PageView');
  }, []);

    const isFirstLoad = useRef(true);

    useEffect(() => {
      // Skip first load (already tracked by the script in layout)
      if (isFirstLoad.current) {
        isFirstLoad.current = false;
        return;
      }

      // Track subsequent page views
      if (typeof window.fbq === 'function') {
        window.fbq('track', 'PageView');
      }
    }, [pathname]);

  return null;
}