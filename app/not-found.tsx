/**
 * =============================================================================
 * Global Not Found Page
 * =============================================================================
 * 
 * Shown for any 404 errors across the app.
 */

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
      <div className="text-6xl mb-4">🐜</div>
      <h1 className="text-2xl font-bold text-neutral-900 mb-2">
        Page Not Found
      </h1>
      <p className="text-neutral-500 mb-6 max-w-sm">
        Oops! This page doesn&apos;t exist. The Anteater got lost.
      </p>
      <Link href="/" className="btn-primary">
        Go Home
      </Link>
    </div>
  );
}

