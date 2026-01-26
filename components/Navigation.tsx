'use client';

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

export default function Navigation() {
  const { data: session, status } = useSession();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  const loading = status === "loading";
  const user = session?.user;

  async function handleLogout() {
    setDropdownOpen(false);
    setMobileMenuOpen(false);
    await signOut({ callbackUrl: '/' });
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        // Check if click was on the hamburger button
        const target = event.target as HTMLElement;
        if (!target.closest('[data-hamburger]')) {
          setMobileMenuOpen(false);
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setDropdownOpen(false);
    setMobileMenuOpen(false);
  }, [pathname]);

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {/* Mobile: Hamburger button */}
      <button
        data-hamburger
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="sm:hidden p-2 rounded-md text-gray-600 hover:text-emerald-700 hover:bg-gray-100 transition-colors"
        aria-label="Toggle menu"
      >
        {mobileMenuOpen ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {/* Mobile: Slide-down menu */}
      {mobileMenuOpen && (
        <div 
          ref={mobileMenuRef}
          className="sm:hidden absolute top-14 left-0 right-0 bg-white border-b shadow-lg z-50"
        >
          <div className="px-4 py-3 space-y-1">
            {/* Nav Links */}
            <Link
              href="/"
              className="block px-3 py-2 rounded-md text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 font-medium"
              onClick={() => setMobileMenuOpen(false)}
            >
              Home
            </Link>
            <Link
              href="/readers"
              className="block px-3 py-2 rounded-md text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 font-medium"
              onClick={() => setMobileMenuOpen(false)}
            >
              Find Readers
            </Link>
            <Link
              href="/about"
              className="block px-3 py-2 rounded-md text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 font-medium"
              onClick={() => setMobileMenuOpen(false)}
            >
              About
            </Link>
            <Link
              href="/pricing"
              className="block px-3 py-2 rounded-md text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 font-medium"
              onClick={() => setMobileMenuOpen(false)}
            >
              Pricing
            </Link>

            {/* Divider */}
            <div className="border-t my-2"></div>

            {/* User-specific links */}
            {user ? (
              <>
                <Link
                  href="/dashboard"
                  className="block px-3 py-2 rounded-md text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-3 py-2 rounded-md text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 font-medium"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="block px-3 py-2 rounded-md text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="block px-3 py-2 rounded-md bg-emerald-600 text-white text-center font-semibold hover:bg-emerald-700"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      )}

      {/* Desktop: User profile dropdown (logged in) */}
      {user && (
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 text-gray-700 hover:text-emerald-700 transition-colors"
          >
            {(user as any).headshotUrl?.trim() ? (
              <img 
                src={(user as any).headshotUrl} 
                alt="Profile" 
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                {user.name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U'}
              </div>
            )}
            <span className="hidden sm:inline text-sm font-medium">{user.name || 'Account'}</span>
            <svg
              className={`hidden sm:block w-4 h-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
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
      )}

      {/* Desktop: Sign In / Sign Up (logged out) */}
      {!user && (
        <div className="hidden sm:flex items-center gap-2 sm:gap-3">
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
      )}
    </div>
  );
}