'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          router.push('/login');
          return;
        }
        const data = await res.json();
        setUser(data.user);
      } catch (err) {
        console.error('Failed to fetch user:', err);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }
    fetchUser();
  }, [router]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>
      <div className="space-y-6">
        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Account Settings</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <dt className="text-gray-600">Name:</dt>
              <dd className="font-medium">{user?.name}</dd>
            </div>
            <div className="flex justify-between items-center">
              <dt className="text-gray-600">Email:</dt>
              <dd className="font-medium">{user?.email}</dd>
            </div>
            <div className="flex justify-between items-center">
              <dt className="text-gray-600">Account Type:</dt>
              <dd className="font-medium">{user?.role === 'READER' ? '📖 Reader' : '🎬 Actor'}</dd>
            </div>
          </dl>
        </div>
        {user?.role === 'READER' && (
          <div className="bg-white border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Subscription</h2>
            <p className="text-sm text-gray-600 mb-4">Manage your reader subscription and billing</p>
            <Link href="/settings/subscription" className="inline-block bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700">Manage Subscription</Link>
          </div>
        )}
        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Notifications</h2>
          <p className="text-sm text-gray-600">Notification preferences coming soon</p>
        </div>
        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Privacy & Security</h2>
          <p className="text-sm text-gray-600 mb-4">Password and security settings coming soon</p>
        </div>
      </div>
      <div className="mt-8">
        <Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">← Back to Dashboard</Link>
      </div>
    </div>
  );
}
