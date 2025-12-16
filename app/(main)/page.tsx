/**
 * =============================================================================
 * Home Page (Task Feed)
 * =============================================================================
 * 
 * The main feed showing available tasks.
 * 
 * FEATURES:
 * - Sort by newest or highest pay
 * - Filter by category and time window
 * - Task cards with accept/chat actions
 * - Pull-to-refresh on mobile
 */

import { Suspense } from 'react';
import { getTasks } from '@/lib/actions/tasks';
import { getUser } from '@/lib/supabase/server';
import TaskFeed from '@/components/task-feed';
import TaskFeedSkeleton from '@/components/task-feed-skeleton';

export default async function HomePage() {
  // These will be passed to client component for filtering
  const user = await getUser();
  
  return (
    <div className="px-4 py-4">
      {/* Header */}
      <header className="mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">
              Sidequest
            </h1>
            <p className="text-sm text-neutral-500">
              Find tasks near you at UCI
            </p>
          </div>
          <div className="w-10 h-10 rounded-full bg-brand-gold-500 flex items-center justify-center">
            <span className="text-xl">🐜</span>
          </div>
        </div>
      </header>
      
      {/* Task feed with filters */}
      <Suspense fallback={<TaskFeedSkeleton />}>
        <TaskFeedContent userId={user?.id || ''} />
      </Suspense>
    </div>
  );
}

/**
 * Server component that fetches initial tasks.
 */
async function TaskFeedContent({ userId }: { userId: string }) {
  const result = await getTasks();
  
  if (!result.success) {
    return (
      <div className="text-center py-12">
        <p className="text-neutral-500">Failed to load tasks</p>
        <p className="text-sm text-neutral-400 mt-1">Please try again later</p>
      </div>
    );
  }
  
  return <TaskFeed initialTasks={result.data || []} currentUserId={userId} />;
}

