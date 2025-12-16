/**
 * =============================================================================
 * My Tasks Client Component
 * =============================================================================
 * 
 * Tab interface showing posted and accepted tasks.
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { TaskWithPoster } from '@/lib/types';
import { STATUS_CONFIG, CATEGORY_OPTIONS } from '@/lib/types';
import { formatPrice, formatRelativeTime, cn } from '@/lib/utils';

interface MyTasksClientProps {
  postedTasks: TaskWithPoster[];
  acceptedTasks: TaskWithPoster[];
  currentUserId: string;
}

export default function MyTasksClient({ 
  postedTasks, 
  acceptedTasks,
  currentUserId 
}: MyTasksClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'posted' | 'accepted'>('posted');
  
  const tasks = activeTab === 'posted' ? postedTasks : acceptedTasks;
  
  return (
    <div className="px-4 py-4">
      {/* Header */}
      <header className="mb-4">
        <h1 className="text-2xl font-bold text-neutral-900">My Tasks</h1>
        <p className="text-sm text-neutral-500">
          Manage your posted and accepted tasks
        </p>
      </header>
      
      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab('posted')}
          className={cn(
            'flex-1 py-3 rounded-xl font-medium transition-colors',
            activeTab === 'posted'
              ? 'bg-brand-blue-500 text-white'
              : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
          )}
        >
          Posted ({postedTasks.length})
        </button>
        <button
          onClick={() => setActiveTab('accepted')}
          className={cn(
            'flex-1 py-3 rounded-xl font-medium transition-colors',
            activeTab === 'accepted'
              ? 'bg-brand-blue-500 text-white'
              : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
          )}
        >
          Accepted ({acceptedTasks.length})
        </button>
      </div>
      
      {/* Task list */}
      {tasks.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">
            {activeTab === 'posted' ? '📝' : '✅'}
          </div>
          <p className="text-neutral-600 font-medium">
            {activeTab === 'posted' 
              ? "You haven't posted any tasks yet"
              : "You haven't accepted any tasks yet"
            }
          </p>
          <p className="text-sm text-neutral-400 mt-1">
            {activeTab === 'posted'
              ? 'Post a task to get help from fellow Anteaters'
              : 'Browse the feed to find tasks you can help with'
            }
          </p>
          {activeTab === 'posted' && (
            <button
              onClick={() => router.push('/post')}
              className="btn-gold mt-4"
            >
              Post a Task
            </button>
          )}
          {activeTab === 'accepted' && (
            <button
              onClick={() => router.push('/')}
              className="btn-secondary mt-4"
            >
              Browse Tasks
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => {
            const category = CATEGORY_OPTIONS.find(c => c.value === task.category);
            
            return (
              <div
                key={task.id}
                onClick={() => router.push(`/tasks/${task.id}`)}
                className="card-interactive p-4"
              >
                {/* Status and time */}
                <div className="flex items-center justify-between mb-2">
                  <span className={cn('badge text-xs', STATUS_CONFIG[task.status].className)}>
                    {STATUS_CONFIG[task.status].label}
                  </span>
                  <span className="text-xs text-neutral-400">
                    {formatRelativeTime(task.created_at)}
                  </span>
                </div>
                
                {/* Title */}
                <h3 className="font-semibold text-neutral-900 mb-2">
                  {task.title}
                </h3>
                
                {/* Details */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={cn('badge text-xs', `category-${task.category.toLowerCase()}`)}>
                      {category?.icon} {category?.label}
                    </span>
                    <span className="text-sm text-neutral-500">
                      {task.location_text}
                    </span>
                  </div>
                  <span className="font-bold text-brand-blue-600">
                    {formatPrice(task.price_cents)}
                  </span>
                </div>
                
                {/* Action hint */}
                {task.status === 'ACCEPTED' && (
                  <div className="mt-3 pt-3 border-t border-neutral-100 flex items-center text-sm text-brand-blue-600">
                    <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    Tap to chat
                  </div>
                )}
                
                {task.status === 'COMPLETE' && (
                  <div className="mt-3 pt-3 border-t border-neutral-100 text-sm text-neutral-500">
                    Completed {task.completed_at && formatRelativeTime(task.completed_at)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

