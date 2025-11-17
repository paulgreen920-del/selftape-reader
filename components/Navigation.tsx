'use client';

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
  headshotUrl?: string | null;
}

export default function Navigation() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  async function checkAuth() {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        if (data.ok && data.user) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    checkAuth();

    // Listen for auth changes (like logout/login)
    const handleAuthChange = () => {
      setLoading(true);
      // Small delay to ensure cookie changes are processed
      setTimeout(() => {
        checkAuth();
      }, 50);
    };

    // Listen for focus events to re-check auth when user returns to tab
    window.addEventListener('focus', handleAuthChange);
    
    // Listen for storage events (in case logout happens in another tab)
    window.addEventListener('storage', handleAuthChange);

    // Custom event for manual auth refresh
    window.addEventListener('auth-change', handleAuthChange);

    return () => {
      window.removeEventListener('focus', handleAuthChange);
      window.removeEventListener('storage', handleAuthChange);
      window.removeEventListener('auth-change', handleAuthChange);
    };
  }, []);

  // Re-check auth when pathname changes (especially for login/logout flows)
  useEffect(() => {
    if (pathname === '/' || pathname === '/dashboard' || pathname === '/login') {
      setLoading(true);
      checkAuth();
    }
  }, [pathname]);

  // Also check auth on any navigation change (fallback)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!loading) {
        checkAuth();
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [pathname, loading]);

  if (loading) {
    return (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
      </div>
    );
  }

  if (user) {
    // User is logged in - show profile icon or headshot
    return (
      <Link
        href="/dashboard"
        className="flex items-center gap-2 text-gray-700 hover:text-emerald-700 transition-colors"
      >
        {user.headshotUrl ? (
          <img
            src={user.headshotUrl}
            alt={user.name || 'User'}
            className="w-8 h-8 rounded-full object-cover border-2 border-emerald-600"
          />
        ) : (
          <div className="w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
            {user.name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U'}
          </div>
        )}
        <span className="hidden sm:inline text-sm font-medium">{user.name || 'Dashboard'}</span>
      </Link>
    );
  }

  // User is not logged in - show sign in/up buttons
  return (
    <div className="flex items-center gap-3">
      <Link
        href="/login"
        className="inline-flex items-center text-gray-700 hover:text-emerald-700 px-3 py-1.5 text-sm font-semibold transition-colors"
      >
        Sign In
      </Link>
      <Link
        href="/signup"
        className="inline-flex items-center rounded-xl bg-emerald-600 text-white px-3 py-1.5 text-sm font-semibold hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 transition-colors"
      >
        Sign Up
      </Link>
    </div>
  );
}