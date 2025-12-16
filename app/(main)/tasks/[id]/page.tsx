/**
 * =============================================================================
 * Task Detail Page
 * =============================================================================
 * 
 * Shows full task details and chat (for participants).
 * 
 * FEATURES:
 * - Task info (title, description, price, location, etc.)
 * - Real-time chat (for poster and accepted worker)
 * - Action buttons (accept, complete, cancel)
 * - Rating prompt (after completion)
 * - Block user option
 */

import { notFound, redirect } from 'next/navigation';
import { getTask } from '@/lib/actions/tasks';
import { getMessages } from '@/lib/actions/messages';
import { hasRated } from '@/lib/actions/ratings';
import { isUserBlocked } from '@/lib/actions/blocks';
import { getUser } from '@/lib/supabase/server';
import TaskDetailClient from './task-detail-client';

interface TaskPageProps {
  params: Promise<{ id: string }>;
}

export default async function TaskPage({ params }: TaskPageProps) {
  const { id } = await params;
  const user = await getUser();
  
  if (!user) {
    redirect('/login');
  }
  
  // Fetch task details
  const taskResult = await getTask(id);
  
  if (!taskResult.success || !taskResult.data) {
    notFound();
  }
  
  const task = taskResult.data;
  
  // Determine user's role
  const isPoster = task.poster_id === user.id;
  const isWorker = task.accepted_by_user_id === user.id;
  const isParticipant = isPoster || isWorker;
  
  // Fetch messages (only for participants)
  let messages: Awaited<ReturnType<typeof getMessages>>['data'] = [];
  if (isParticipant && task.status !== 'OPEN') {
    const messagesResult = await getMessages(id);
    if (messagesResult.success && messagesResult.data) {
      messages = messagesResult.data;
    }
  }
  
  // Check if user has rated (only for completed tasks)
  let userHasRated = false;
  if (task.status === 'COMPLETE' && isParticipant) {
    const ratedResult = await hasRated(id);
    if (ratedResult.success) {
      userHasRated = ratedResult.data || false;
    }
  }
  
  // Check if other participant is blocked
  let otherUserId: string | null = null;
  if (isPoster && task.accepted_by_user_id) {
    otherUserId = task.accepted_by_user_id;
  } else if (isWorker) {
    otherUserId = task.poster_id;
  }
  
  let isOtherBlocked = false;
  if (otherUserId) {
    const blockedResult = await isUserBlocked(otherUserId);
    if (blockedResult.success) {
      isOtherBlocked = blockedResult.data || false;
    }
  }
  
  return (
    <TaskDetailClient
      task={task}
      messages={messages || []}
      currentUserId={user.id}
      isPoster={isPoster}
      isWorker={isWorker}
      userHasRated={userHasRated}
      isOtherBlocked={isOtherBlocked}
    />
  );
}

