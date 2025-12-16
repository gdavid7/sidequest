/**
 * =============================================================================
 * Task Card Component
 * =============================================================================
 * 
 * Displays a task in the feed with key info and actions.
 * 
 * DESIGN:
 * - Mobile-first with large touch targets
 * - Essential info visible at a glance
 * - Status-appropriate CTAs
 */

'use client';

import type { TaskWithPoster } from '@/lib/types';
import { STATUS_CONFIG, CATEGORY_OPTIONS } from '@/lib/types';
import { formatPrice, formatRelativeTime, getDisplayName, cn } from '@/lib/utils';

interface TaskCardProps {
  task: TaskWithPoster;
  currentUserId: string;
  onAccept: (taskId: string) => void;
  onClick: (taskId: string) => void;
}

export default function TaskCard({ task, currentUserId, onAccept, onClick }: TaskCardProps) {
  const isPoster = task.poster_id === currentUserId;
  const isWorker = task.accepted_by_user_id === currentUserId;
  const isParticipant = isPoster || isWorker;
  
  // Find category config
  const category = CATEGORY_OPTIONS.find(c => c.value === task.category);
  
  // Determine what action to show
  const showAccept = task.status === 'OPEN' && !isPoster;
  const showChat = isParticipant && task.status === 'ACCEPTED';
  
  /**
   * Handle accept button click.
   * Stop propagation to prevent card click.
   */
  const handleAcceptClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAccept(task.id);
  };
  
  /**
   * Handle chat button click.
   */
  const handleChatClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick(task.id);
  };
  
  return (
    <div 
      className="card-interactive p-4"
      onClick={() => onClick(task.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick(task.id)}
    >
      {/* Top row: Category, status, time */}
      <div className="flex items-center gap-2 mb-2">
        {/* Category badge */}
        <span className={cn(
          'badge text-xs',
          `category-${task.category.toLowerCase()}`
        )}>
          {category?.icon} {category?.label}
        </span>
        
        {/* Status badge (if not OPEN) */}
        {task.status !== 'OPEN' && (
          <span className={cn('badge text-xs', STATUS_CONFIG[task.status].className)}>
            {STATUS_CONFIG[task.status].label}
          </span>
        )}
        
        {/* Posted time */}
        <span className="text-xs text-neutral-400 ml-auto">
          {formatRelativeTime(task.created_at)}
        </span>
      </div>
      
      {/* Title */}
      <h3 className="font-semibold text-neutral-900 mb-1 line-clamp-2">
        {task.title}
      </h3>
      
      {/* Location */}
      <div className="flex items-center gap-1 text-sm text-neutral-500 mb-3">
        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span className="truncate">{task.location_text}</span>
      </div>
      
      {/* Bottom row: Price, time window, action */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Price */}
          <span className="text-lg font-bold text-brand-blue-600">
            {formatPrice(task.price_cents)}
          </span>
          
          {/* Time window badge */}
          <span className="text-xs px-2 py-1 bg-neutral-100 rounded-full text-neutral-600">
            {task.time_window === 'NOW' && '⚡ Now'}
            {task.time_window === 'TODAY' && '📅 Today'}
            {task.time_window === 'THIS_WEEK' && '🗓️ This Week'}
            {task.time_window === 'SCHEDULED' && '⏰ Scheduled'}
          </span>
        </div>
        
        {/* Action button */}
        {showAccept && (
          <button
            onClick={handleAcceptClick}
            className="btn-gold text-sm py-1.5 px-4"
          >
            Accept
          </button>
        )}
        
        {showChat && (
          <button
            onClick={handleChatClick}
            className="btn-secondary text-sm py-1.5 px-4"
          >
            Chat
          </button>
        )}
        
        {isPoster && task.status === 'OPEN' && (
          <span className="text-xs text-neutral-400">Your task</span>
        )}
      </div>
      
      {/* Poster info (subtle) */}
      <div className="mt-3 pt-3 border-t border-neutral-100 flex items-center text-xs text-neutral-400">
        <span>Posted by </span>
        <span className="font-medium text-neutral-600 ml-1">
          {isPoster ? 'you' : getDisplayName(task.poster)}
        </span>
        {task.poster_rating?.count && task.poster_rating.count > 0 && (
          <span className="ml-2 flex items-center gap-0.5">
            <svg className="w-3 h-3 text-brand-gold-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span>{task.poster_rating.avg}</span>
            <span className="text-neutral-300">({task.poster_rating.count})</span>
          </span>
        )}
      </div>
    </div>
  );
}

