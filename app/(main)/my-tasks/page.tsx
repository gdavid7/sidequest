/**
 * =============================================================================
 * My Tasks Page
 * =============================================================================
 * 
 * Shows tasks the user has posted or accepted.
 * Organized into tabs for easy navigation.
 */

import { redirect } from 'next/navigation';
import { getUser } from '@/lib/supabase/server';
import { getMyTasks } from '@/lib/actions/tasks';
import MyTasksClient from './my-tasks-client';

export default async function MyTasksPage() {
  const user = await getUser();
  
  if (!user) {
    redirect('/login');
  }
  
  const result = await getMyTasks();
  
  if (!result.success) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-neutral-500">Failed to load your tasks</p>
        <p className="text-sm text-neutral-400 mt-1">Please try again later</p>
      </div>
    );
  }
  
  return (
    <MyTasksClient 
      postedTasks={result.data?.posted || []}
      acceptedTasks={result.data?.accepted || []}
      currentUserId={user.id}
    />
  );
}

