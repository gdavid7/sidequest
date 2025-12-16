/**
 * =============================================================================
 * Task Not Found Page
 * =============================================================================
 * 
 * Shown when a task doesn't exist or user doesn't have access.
 */

import Link from 'next/link';

export default function TaskNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="text-6xl mb-4">🔍</div>
      <h1 className="text-2xl font-bold text-neutral-900 mb-2">
        Task Not Found
      </h1>
      <p className="text-neutral-500 mb-6 max-w-sm">
        This task may have been deleted, or you might not have permission to view it.
      </p>
      <Link href="/" className="btn-primary">
        Back to Feed
      </Link>
    </div>
  );
}

