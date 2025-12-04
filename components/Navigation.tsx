'use client';

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
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
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
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

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      setDropdownOpen(false);
      window.dispatchEvent(new CustomEvent('auth-change'));
      window.location.href = '/';
    } catch (err) {
      console.error('Logout failed:', err);
      window.location.href = '/';
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown on route change
  useEffect(() => {
    setDropdownOpen(false);
  }, [pathname]);

  useEffect(() => {
    checkAuth();

    const handleAuthChange = () => {
      setLoading(true);
      setTimeout(() => {
        checkAuth();
      }, 50);
    };

    window.addEventListener('focus', handleAuthChange);
    window.addEventListener('storage', handleAuthChange);
    window.addEventListener('auth-change', handleAuthChange);

    return () => {
      window.removeEventListener('focus', handleAuthChange);
      window.removeEventListener('storage', handleAuthChange);
      window.removeEventListener('auth-change', handleAuthChange);
    };
  }, []);

  useEffect(() => {
    if (pathname === '/' || pathname === '/dashboard' || pathname === '/login') {
      setLoading(true);
      checkAuth();
    }
  }, [pathname]);

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
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
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
          <span className="hidden sm:inline text-sm font-medium">{user.name || 'Account'}</span>
          <svg
            className={`w-4 h-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {dropdownOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
            <Link
              href="/dashboard"
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700"
              onClick={() => setDropdownOpen(false)}
            >
              Dashboard
            </Link>
            <button
              onClick={handleLogout}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700"
            >
              Sign Out
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <Link
        href="/login"
        className="inline-flex items-center justify-center text-gray-700 hover:text-emerald-700 px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap"
      >
        Sign In
      </Link>
      <Link
        href="/signup"
        className="inline-flex items-center justify-center rounded-lg sm:rounded-xl bg-emerald-600 text-white px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-semibold hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 transition-colors whitespace-nowrap text-center"
      >
        Sign Up
      </Link>
    </div>
  );
}