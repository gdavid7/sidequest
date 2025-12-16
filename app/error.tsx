/**
 * =============================================================================
 * Global Error Page
 * =============================================================================
 * 
 * Shown when an unhandled error occurs.
 * This is a client component that can reset the error boundary.
 */

'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console (in production, send to error tracking service)
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
      <div className="text-6xl mb-4">😵</div>
      <h1 className="text-2xl font-bold text-neutral-900 mb-2">
        Something Went Wrong
      </h1>
      <p className="text-neutral-500 mb-6 max-w-sm">
        We hit an unexpected error. Please try again.
      </p>
      <button
        onClick={reset}
        className="btn-primary"
      >
        Try Again
      </button>
    </div>
  );
}

