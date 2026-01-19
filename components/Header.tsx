"use client";

import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function Header() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch('/api/auth/me', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data.ok) {
            console.log('[Header] User data:', data.user);
            console.log('[Header] headshotUrl:', data.user.headshotUrl);
            console.log('[Header] headshotUrl trimmed:', data.user.headshotUrl?.trim());
            setUser(data.user);
          }
        }
      } catch {}
    }
    fetchUser();
  }, []);

  // Get initials from name
  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <header className="bg-white border-b">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/" className="flex items-center space-x-2">
            <img src="/logo.png" alt="Self-Tape Logo" className="h-8 w-8 object-contain" />
            <span className="font-bold text-lg text-rose-600">Self-Tape</span>
          </Link>

          <div className="hidden md:block">
            <div className="flex items-center bg-gray-100 rounded-full overflow-hidden">
              <input className="px-4 py-2 bg-transparent outline-none w-72" placeholder="Search readers, genres, services" />
              <button className="px-4 bg-rose-600 text-white rounded-r-full">Search</button>
            </div>
          </div>
        </div>

        <nav className="hidden md:flex items-center space-x-4 text-sm">
          <Link href="/readers" className="hover:underline">Browse</Link>
          {!user && (
            <>
              <Link href="/signup" className="hover:underline">For readers</Link>
              <Link href="/pricing" className="hover:underline">Pricing</Link>
              <Link href="/login" className="text-sm">Sign in</Link>
              <Link href="/signup" className="px-4 py-2 bg-rose-600 text-white rounded-md">Get started</Link>
            </>
          )}
          {user && (
            <div className="relative ml-4">
              <button
                className="flex items-center justify-center w-9 h-9 rounded-full bg-gray-200 hover:bg-gray-300 focus:outline-none overflow-hidden"
                onClick={() => setOpen((v) => !v)}
              >
                <span className="sr-only">Open user menu</span>
                {user.headshotUrl?.trim() ? (
                  <img src={user.headshotUrl.trim()} alt="Profile" className="w-9 h-9 rounded-full object-cover" />
                ) : (
                  <span className="text-sm font-medium text-gray-600">{getInitials(user.name || user.displayName)}</span>
                )}
              </button>
              {open && (
                <div className="absolute right-0 mt-2 w-40 bg-white border rounded shadow-lg z-50">
                  <Link href="/dashboard" className="block px-4 py-2 text-gray-700 hover:bg-gray-100">Dashboard</Link>
                  <Link href="/settings" className="block px-4 py-2 text-gray-700 hover:bg-gray-100">Settings</Link>
                  <button onClick={() => window.location.href = '/api/auth/signout'} className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100">Sign Out</button>
                </div>
              )}
            </div>
          )}
        </nav>

        <div className="md:hidden">
          <button onClick={() => setOpen((v) => !v)} className="p-2 rounded-md border">
            <span className="sr-only">Toggle menu</span>
            {open ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t bg-white">
          <div className="px-4 py-3 space-y-2">
            <Link href="/readers" className="block">Browse</Link>
            {!user ? (
              <>
                <Link href="/signup" className="block">For readers</Link>
                <Link href="/pricing" className="block">Pricing</Link>
                <Link href="/login" className="block">Sign in</Link>
                <Link href="/signup" className="block mt-2 px-4 py-2 bg-rose-600 text-white rounded-md text-center">Get started</Link>
              </>
            ) : (
              <>
                <Link href="/dashboard" className="block">Dashboard</Link>
                <Link href="/settings" className="block">Settings</Link>
                <button onClick={() => window.location.href = '/api/auth/signout'} className="block w-full text-left">Sign Out</button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}