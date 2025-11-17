'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAdmin() {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          router.push('/login');
          return;
        }
        const data = await res.json();
        
        if (data.user.role !== 'ADMIN') {
          router.push('/dashboard');
          return;
        }
        
        setUser(data.user);
      } catch (err) {
        console.error('Failed to check admin:', err);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }
    checkAdmin();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Header */}
      <div className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <h1 className="text-xl font-bold">Admin Panel</h1>
              <nav className="flex gap-4">
                <Link
                  href="/admin"
                  className="px-3 py-2 rounded-md text-sm hover:bg-gray-800"
                >
                  Dashboard
                </Link>
                <Link
                  href="/admin/users"
                  className="px-3 py-2 rounded-md text-sm hover:bg-gray-800"
                >
                  Users
                </Link>
                <Link
                  href="/admin/bookings"
                  className="px-3 py-2 rounded-md text-sm hover:bg-gray-800"
                >
                  Bookings
                </Link>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-300">{user.email}</span>
              <Link
                href="/dashboard"
                className="px-3 py-2 rounded-md text-sm bg-gray-800 hover:bg-gray-700"
              >
                User View
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </div>
    </div>
  );
}
