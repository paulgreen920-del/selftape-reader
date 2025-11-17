'use client';

import { useEffect, useState } from 'react';

interface PaymentProcessorProps {
  bookingId: string;
}

export default function PaymentProcessor({ bookingId }: PaymentProcessorProps) {
  const [processing, setProcessing] = useState(true);
  const [processed, setProcessed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processPayment = async () => {
      try {
        console.log('Processing payment completion for booking:', bookingId);
        
        // Call our manual webhook processing endpoint
        const response = await fetch('/api/webhooks/manual-process', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ bookingId }),
        });

        if (response.ok) {
          const result = await response.json();
          console.log('Payment processing result:', result);
          setProcessed(true);
        } else {
          const errorData = await response.json();
          setError(errorData.error || 'Failed to process payment');
        }
      } catch (err) {
        console.error('Error processing payment:', err);
        setError('Failed to process payment');
      } finally {
        setProcessing(false);
      }
    };

    if (bookingId) {
      processPayment();
    }
  }, [bookingId]);

  if (processing) {
    return (
      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center gap-3">
          <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
          <span className="text-blue-800 font-medium">Processing your payment...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <div>
            <p className="text-yellow-800 font-medium">Payment Processing Notice</p>
            <p className="text-yellow-700 text-sm">Your payment was successful, but there may be a delay in updating your booking status.</p>
          </div>
        </div>
      </div>
    );
  }

  if (processed) {
    return (
      <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-emerald-800 font-medium">Payment processed successfully!</span>
        </div>
      </div>
    );
  }

  return null;
}