'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function VerifyEmailPage() {
  const [isChecking, setIsChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    // Set flag in localStorage to indicate this tab is waiting
    localStorage.setItem('emailVerificationWaiting', 'true');

    const checkVerificationStatus = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const data = await response.json();
          
          if (data.user && data.user.emailVerified) {
            clearInterval(intervalId);
            localStorage.removeItem('emailVerificationWaiting');
            
            // Show verified state briefly before redirect
            setIsVerified(true);
            
            // Redirect after a moment
            setTimeout(() => {
              if (data.user.role === 'READER') {
                router.push(`/onboarding/${data.user.onboardingStep || 'reader'}`);
              } else {
                router.push('/dashboard');
              }
            }, 1500);
          }
        }
      } catch (error) {
        console.error('Failed to check verification status:', error);
      }
    };

    // Listen for storage events (messages from other tabs)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'emailVerified' && e.newValue === 'true') {
        // Verification happened in another tab!
        localStorage.removeItem('emailVerified');
        localStorage.removeItem('emailVerificationWaiting');
        checkVerificationStatus();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Check immediately
    checkVerificationStatus().then(() => setIsChecking(false));

    // Then poll every 3 seconds
    intervalId = setInterval(checkVerificationStatus, 3000);

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
      localStorage.removeItem('emailVerificationWaiting');
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [router]);

  const handleResendEmail = async () => {
    try {
      setError(null);
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to resend verification email');
      } else {
        alert('Verification email sent! Please check your inbox.');
      }
    } catch (error) {
      setError('An error occurred while resending the email');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        {isVerified ? (
          <div>
            <div className="text-6xl mb-6">✅</div>
            <h2 className="mt-6 text-3xl font-extrabold text-green-600">
              Email Verified!
            </h2>
            <p className="mt-2 text-lg text-gray-700 font-semibold">
              Redirecting to onboarding...
            </p>
            <div className="mt-4">
              <div className="inline-block border-4 border-green-600 border-t-transparent rounded-full w-12 h-12 animate-spin"></div>
            </div>
          </div>
        ) : (
          <>
            <div>
              <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                Verify your email
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                We've sent a verification link to your email address.
              </p>
            </div>

        <div className="rounded-md bg-blue-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-blue-400"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3 flex-1 md:flex md:justify-between">
              <p className="text-sm text-blue-700 text-left">
                Click the link in your email to verify your account and continue with onboarding.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Didn't receive the email?
          </p>
          <button
            onClick={handleResendEmail}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Resend verification email
          </button>
        </div>

            <div className="text-xs text-gray-500 mt-4">
              {isChecking ? (
                <p>Checking verification status...</p>
              ) : (
                <p>Waiting for email verification...</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
