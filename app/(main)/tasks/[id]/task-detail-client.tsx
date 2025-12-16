/**
 * =============================================================================
 * Task Detail Client Component
 * =============================================================================
 * 
 * Handles all interactive parts of the task detail page:
 * - Chat with polling (FREE - no Supabase Realtime needed!)
 * - Action buttons (accept, complete, cancel)
 * - Rating form
 * - Block user
 * 
 * WHY POLLING INSTEAD OF REALTIME?
 * ================================
 * Supabase Realtime requires database replication ($10.25/month).
 * For an MVP with low traffic, polling every 3 seconds works great:
 * - Completely free (uses regular database queries)
 * - Simple to implement and debug
 * - Can easily upgrade to Realtime later when app grows
 * 
 * EXTENSION POINT: To upgrade to Realtime later:
 * 1. Enable Realtime replication in Supabase dashboard
 * 2. Replace the polling useEffect with Supabase channel subscription
 * 3. See commented code below for the Realtime implementation
 */

'use client';

import { useState, useEffect, useRef, useTransition, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { acceptTask, cancelTask, completeTask } from '@/lib/actions/tasks';
import { sendMessage, getMessages } from '@/lib/actions/messages';
import { submitRating } from '@/lib/actions/ratings';
import { blockUser, unblockUser } from '@/lib/actions/blocks';
import type { TaskWithDetails, MessageWithSender } from '@/lib/types';
import { STATUS_CONFIG, CATEGORY_OPTIONS } from '@/lib/types';
import { formatPrice, formatRelativeTime, formatTaskTime, getDisplayName, cn } from '@/lib/utils';

interface TaskDetailClientProps {
  task: TaskWithDetails;
  messages: MessageWithSender[];
  currentUserId: string;
  isPoster: boolean;
  isWorker: boolean;
  userHasRated: boolean;
  isOtherBlocked: boolean;
}

export default function TaskDetailClient({
  task,
  messages: initialMessages,
  currentUserId,
  isPoster,
  isWorker,
  userHasRated,
  isOtherBlocked: initialIsBlocked,
}: TaskDetailClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [messages, setMessages] = useState(initialMessages);
  const [newMessage, setNewMessage] = useState('');
  const [showRatingForm, setShowRatingForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [isBlocked, setIsBlocked] = useState(initialIsBlocked);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const isParticipant = isPoster || isWorker;
  const category = CATEGORY_OPTIONS.find(c => c.value === task.category);
  
  // Determine other user for blocking
  const otherUserId = isPoster ? task.accepted_by_user_id : task.poster_id;
  const otherUser = isPoster ? task.accepted_by : task.poster;
  
  /**
   * Fetch new messages from the server.
   * Called by polling interval to check for updates.
   */
  const fetchMessages = useCallback(async () => {
    const result = await getMessages(task.id);
    if (result.success && result.data) {
      setMessages(result.data);
    }
  }, [task.id]);
  
  /**
   * POLLING-BASED CHAT (FREE!)
   * ==========================
   * Instead of using Supabase Realtime (which costs $10.25/month),
   * we poll for new messages every 3 seconds.
   * 
   * This works great for an MVP because:
   * - It's completely free
   * - 3 second delay is acceptable for task coordination
   * - Low traffic means minimal database load
   * 
   * EXTENSION POINT: Upgrade to Realtime
   * When your app grows and you want instant messaging:
   * 
   * 1. Enable Realtime in Supabase dashboard (Database > Replication)
   * 2. Replace this useEffect with:
   * 
   *   useEffect(() => {
   *     const supabase = createClient();
   *     const channel = supabase
   *       .channel(`messages:${task.id}`)
   *       .on('postgres_changes', {
   *         event: 'INSERT',
   *         schema: 'public',
   *         table: 'messages',
   *         filter: `task_id=eq.${task.id}`,
   *       }, (payload) => {
   *         // Fetch full message with sender info and add to state
   *       })
   *       .subscribe();
   *     return () => supabase.removeChannel(channel);
   *   }, [task.id]);
   */
  useEffect(() => {
    // Only poll if user is a participant and task is active
    if (!isParticipant || task.status === 'OPEN' || task.status === 'CANCELED') {
      return;
    }
    
    // Poll every 3 seconds for new messages
    const POLL_INTERVAL_MS = 3000;
    
    const intervalId = setInterval(() => {
      fetchMessages();
    }, POLL_INTERVAL_MS);
    
    // Cleanup on unmount
    return () => {
      clearInterval(intervalId);
    };
  }, [task.id, task.status, isParticipant, fetchMessages]);
  
  /**
   * Scroll to bottom when new messages arrive.
   */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  /**
   * Handle sending a message.
   */
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isPending) return;
    
    const messageText = newMessage.trim();
    setNewMessage('');
    
    // Optimistic update
    const optimisticMessage: MessageWithSender = {
      id: `temp-${Date.now()}`,
      task_id: task.id,
      sender_id: currentUserId,
      type: 'TEXT',
      body: messageText,
      created_at: new Date().toISOString(),
      sender: {
        id: currentUserId,
        display_name: null,
        email: '',
      },
    };
    setMessages(prev => [...prev, optimisticMessage]);
    
    const result = await sendMessage(task.id, messageText);
    
    if (!result.success) {
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
      setError(result.error || 'Failed to send message');
    }
  };
  
  /**
   * Handle accepting the task.
   */
  const handleAccept = () => {
    startTransition(async () => {
      const result = await acceptTask(task.id);
      if (result.success) {
        router.refresh();
      } else {
        setError(result.error || 'Failed to accept task');
      }
    });
  };
  
  /**
   * Handle completing the task.
   */
  const handleComplete = () => {
    startTransition(async () => {
      const result = await completeTask(task.id);
      if (result.success) {
        router.refresh();
        setShowRatingForm(true);
      } else {
        setError(result.error || 'Failed to complete task');
      }
    });
  };
  
  /**
   * Handle canceling the task.
   */
  const handleCancel = () => {
    if (!confirm('Are you sure you want to cancel this task?')) return;
    
    startTransition(async () => {
      const result = await cancelTask(task.id);
      if (result.success) {
        router.refresh();
      } else {
        setError(result.error || 'Failed to cancel task');
      }
    });
  };
  
  /**
   * Handle submitting a rating.
   */
  const handleSubmitRating = async () => {
    startTransition(async () => {
      const result = await submitRating({
        taskId: task.id,
        stars: rating,
        comment: ratingComment || undefined,
      });
      
      if (result.success) {
        setShowRatingForm(false);
        router.refresh();
      } else {
        setError(result.error || 'Failed to submit rating');
      }
    });
  };
  
  /**
   * Handle blocking/unblocking user.
   */
  const handleToggleBlock = async () => {
    if (!otherUserId) return;
    
    startTransition(async () => {
      if (isBlocked) {
        const result = await unblockUser(otherUserId);
        if (result.success) {
          setIsBlocked(false);
          setShowBlockConfirm(false);
        } else {
          setError(result.error || 'Failed to unblock user');
        }
      } else {
        const result = await blockUser(otherUserId);
        if (result.success) {
          setIsBlocked(true);
          setShowBlockConfirm(false);
          router.push('/'); // Go back to feed after blocking
        } else {
          setError(result.error || 'Failed to block user');
        }
      }
    });
  };
  
  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      {/* Header */}
      <header className="px-4 py-3 bg-white border-b border-neutral-100 flex items-center gap-3">
        <button 
          onClick={() => router.back()}
          className="p-2 -ml-2 text-neutral-500 hover:text-neutral-700"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-neutral-900 truncate">{task.title}</h1>
          <span className={cn('text-xs', STATUS_CONFIG[task.status].className)}>
            {STATUS_CONFIG[task.status].label}
          </span>
        </div>
        
        {/* More options (block) */}
        {isParticipant && otherUserId && (
          <div className="relative">
            <button
              onClick={() => setShowBlockConfirm(!showBlockConfirm)}
              className="p-2 text-neutral-400 hover:text-neutral-600"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
            
            {showBlockConfirm && (
              <div className="absolute right-0 top-10 bg-white rounded-xl shadow-lg border border-neutral-200 p-3 z-10 w-48 animate-slide-down">
                <p className="text-sm text-neutral-600 mb-2">
                  {isBlocked ? 'Unblock this user?' : 'Block this user?'}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleToggleBlock}
                    disabled={isPending}
                    className={cn(
                      'flex-1 text-sm py-1.5 rounded-lg',
                      isBlocked ? 'btn-secondary' : 'btn-danger'
                    )}
                  >
                    {isBlocked ? 'Unblock' : 'Block'}
                  </button>
                  <button
                    onClick={() => setShowBlockConfirm(false)}
                    className="flex-1 btn-ghost text-sm py-1.5"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </header>
      
      {/* Main content - scrollable */}
      <div className="flex-1 overflow-y-auto">
        {/* Task details card */}
        <div className="p-4 bg-white border-b border-neutral-100">
          {/* Category and price */}
          <div className="flex items-center justify-between mb-3">
            <span className={cn('badge', `category-${task.category.toLowerCase()}`)}>
              {category?.icon} {category?.label}
            </span>
            <span className="text-xl font-bold text-brand-blue-600">
              {formatPrice(task.price_cents)}
            </span>
          </div>
          
          {/* Description */}
          <p className="text-neutral-700 mb-4">{task.description}</p>
          
          {/* Details grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-neutral-600">
              <svg className="w-4 h-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
              {task.location_text}
            </div>
            <div className="flex items-center gap-2 text-neutral-600">
              <svg className="w-4 h-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {task.time_window === 'SCHEDULED' && task.scheduled_at
                ? formatTaskTime(task.scheduled_at)
                : task.time_window
              }
            </div>
          </div>
          
          {/* Participants */}
          <div className="mt-4 pt-4 border-t border-neutral-100 space-y-2">
            {/* Poster */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-500">Posted by</span>
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">
                  {isPoster ? 'You' : getDisplayName(task.poster)}
                </span>
                {task.poster_rating?.count && task.poster_rating.count > 0 && (
                  <span className="flex items-center gap-0.5 text-xs text-neutral-500">
                    <svg className="w-3 h-3 text-brand-gold-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    {task.poster_rating.avg} ({task.poster_rating.count})
                  </span>
                )}
              </div>
            </div>
            
            {/* Accepted worker */}
            {task.accepted_by && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-500">Accepted by</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">
                    {isWorker ? 'You' : getDisplayName(task.accepted_by)}
                  </span>
                  {task.accepted_by_rating?.count && task.accepted_by_rating.count > 0 && (
                    <span className="flex items-center gap-0.5 text-xs text-neutral-500">
                      <svg className="w-3 h-3 text-brand-gold-500" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      {task.accepted_by_rating.avg} ({task.accepted_by_rating.count})
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Action buttons */}
          <div className="mt-4 pt-4 border-t border-neutral-100">
            {/* Not logged in user's task and it's open - can accept */}
            {!isPoster && !isWorker && task.status === 'OPEN' && (
              <button
                onClick={handleAccept}
                disabled={isPending}
                className="btn-gold w-full"
              >
                {isPending ? 'Accepting...' : 'Accept This Task'}
              </button>
            )}
            
            {/* Poster with accepted task - can complete or cancel */}
            {isPoster && task.status === 'ACCEPTED' && (
              <div className="flex gap-2">
                <button
                  onClick={handleComplete}
                  disabled={isPending}
                  className="btn-primary flex-1"
                >
                  {isPending ? 'Completing...' : 'Mark Complete'}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={isPending}
                  className="btn-ghost text-red-500 hover:bg-red-50"
                >
                  Cancel
                </button>
              </div>
            )}
            
            {/* Worker with accepted task - can cancel */}
            {isWorker && task.status === 'ACCEPTED' && (
              <button
                onClick={handleCancel}
                disabled={isPending}
                className="btn-ghost text-red-500 hover:bg-red-50 w-full"
              >
                Cancel Task
              </button>
            )}
            
            {/* Poster with open task - can cancel */}
            {isPoster && task.status === 'OPEN' && (
              <button
                onClick={handleCancel}
                disabled={isPending}
                className="btn-ghost text-red-500 hover:bg-red-50 w-full"
              >
                Cancel Task
              </button>
            )}
          </div>
        </div>
        
        {/* Rating prompt (after completion) */}
        {task.status === 'COMPLETE' && isParticipant && !userHasRated && (
          <div className="p-4 bg-brand-gold-50 border-b border-brand-gold-200">
            {!showRatingForm ? (
              <button
                onClick={() => setShowRatingForm(true)}
                className="w-full text-center"
              >
                <p className="text-brand-blue-800 font-medium">
                  Task completed! 🎉
                </p>
                <p className="text-sm text-brand-blue-600 mt-1">
                  Tap to rate {isPoster ? 'the worker' : 'the poster'}
                </p>
              </button>
            ) : (
              <div className="space-y-3">
                <p className="font-medium text-brand-blue-800">
                  Rate {otherUser ? getDisplayName(otherUser) : 'them'}
                </p>
                
                {/* Star rating */}
                <div className="flex gap-1 justify-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      className="p-1"
                    >
                      <svg 
                        className={cn(
                          'w-8 h-8 transition-colors',
                          star <= rating ? 'text-brand-gold-500' : 'text-neutral-300'
                        )} 
                        fill="currentColor" 
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </button>
                  ))}
                </div>
                
                {/* Comment */}
                <textarea
                  value={ratingComment}
                  onChange={(e) => setRatingComment(e.target.value)}
                  placeholder="Add a comment (optional)"
                  className="input text-sm"
                  rows={2}
                  maxLength={500}
                />
                
                <div className="flex gap-2">
                  <button
                    onClick={handleSubmitRating}
                    disabled={isPending}
                    className="btn-primary flex-1"
                  >
                    {isPending ? 'Submitting...' : 'Submit Rating'}
                  </button>
                  <button
                    onClick={() => setShowRatingForm(false)}
                    className="btn-ghost"
                  >
                    Skip
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Chat messages */}
        {isParticipant && task.status !== 'OPEN' && (
          <div className="p-4 space-y-3">
            {messages.length === 0 ? (
              <p className="text-center text-neutral-400 text-sm py-8">
                No messages yet. Start the conversation!
              </p>
            ) : (
              messages.map((message) => {
                const isMine = message.sender_id === currentUserId;
                const isSystem = message.type === 'SYSTEM';
                
                if (isSystem) {
                  return (
                    <div key={message.id} className="message-system">
                      {message.body}
                    </div>
                  );
                }
                
                return (
                  <div
                    key={message.id}
                    className={cn(
                      'flex flex-col',
                      isMine ? 'items-end' : 'items-start'
                    )}
                  >
                    <div className={isMine ? 'message-sent' : 'message-received'}>
                      {message.body}
                    </div>
                    <span className="text-xs text-neutral-400 mt-1">
                      {formatRelativeTime(message.created_at)}
                    </span>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
        
        {/* Error message */}
        {error && (
          <div className="mx-4 mb-4 p-3 bg-red-50 text-red-800 text-sm rounded-xl">
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-2 text-red-600 underline"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>
      
      {/* Message input (for participants in active chats) */}
      {isParticipant && task.status === 'ACCEPTED' && (
        <form
          onSubmit={handleSendMessage}
          className="p-4 bg-white border-t border-neutral-100 flex gap-2"
        >
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="input flex-1"
            disabled={isPending}
          />
          <button
            type="submit"
            disabled={isPending || !newMessage.trim()}
            className="btn-primary px-4"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>
      )}
    </div>
  );
}

