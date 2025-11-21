"use client";

import Link from 'next/link';
import { useState } from 'react';

export default function Header() {
  const [open, setOpen] = useState(false);

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
          <Link href="/signup" className="hover:underline">For readers</Link>
          <Link href="/pricing" className="hover:underline">Pricing</Link>
          <Link href="/login" className="text-sm">Sign in</Link>
          <Link href="/signup" className="px-4 py-2 bg-rose-600 text-white rounded-md">Get started</Link>
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
            <Link href="/signup" className="block">For readers</Link>
            <Link href="/pricing" className="block">Pricing</Link>
            <Link href="/login" className="block">Sign in</Link>
            <Link href="/signup" className="block mt-2 px-4 py-2 bg-rose-600 text-white rounded-md">Get started</Link>
          </div>
        </div>
      )}
    </header>
  );
}
