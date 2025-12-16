/**
 * =============================================================================
 * Task Feed Client Component
 * =============================================================================
 * 
 * Handles filtering, sorting, and displaying tasks.
 * Uses optimistic updates for accept actions.
 */

'use client';

import { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getTasks, acceptTask } from '@/lib/actions/tasks';
import type { TaskWithPoster, TaskFilters, TaskCategory, TimeWindow } from '@/lib/types';
import { CATEGORY_OPTIONS, TIME_WINDOW_OPTIONS } from '@/lib/types';
import TaskCard from './task-card';
import { cn } from '@/lib/utils';

interface TaskFeedProps {
  initialTasks: TaskWithPoster[];
  currentUserId: string;
}

export default function TaskFeed({ initialTasks, currentUserId }: TaskFeedProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [tasks, setTasks] = useState(initialTasks);
  const [filters, setFilters] = useState<TaskFilters>({
    category: 'ALL',
    timeWindow: 'ALL',
    minPrice: null,
    sort: 'newest',
  });
  const [showFilters, setShowFilters] = useState(false);
  
  // Filter tasks client-side for instant feedback
  const filteredTasks = useMemo(() => {
    let result = tasks;
    
    if (filters.category !== 'ALL') {
      result = result.filter(t => t.category === filters.category);
    }
    
    if (filters.timeWindow !== 'ALL') {
      result = result.filter(t => t.time_window === filters.timeWindow);
    }
    
    if (filters.minPrice) {
      result = result.filter(t => t.price_cents >= filters.minPrice!);
    }
    
    // Sort
    if (filters.sort === 'highest_pay') {
      result = [...result].sort((a, b) => b.price_cents - a.price_cents);
    } else {
      result = [...result].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }
    
    return result;
  }, [tasks, filters]);
  
  /**
   * Refetch tasks from server.
   */
  const refreshTasks = () => {
    startTransition(async () => {
      const result = await getTasks(filters);
      if (result.success && result.data) {
        setTasks(result.data);
      }
    });
  };
  
  /**
   * Handle accepting a task.
   */
  const handleAccept = async (taskId: string) => {
    // Optimistic update
    setTasks(prev => prev.map(t => 
      t.id === taskId 
        ? { ...t, status: 'ACCEPTED' as const, accepted_by_user_id: currentUserId }
        : t
    ));
    
    const result = await acceptTask(taskId);
    
    if (!result.success) {
      // Revert on error
      refreshTasks();
      alert(result.error || 'Failed to accept task');
    } else {
      // Navigate to task chat
      router.push(`/tasks/${taskId}`);
    }
  };
  
  /**
   * Handle clicking a task card.
   */
  const handleTaskClick = (taskId: string) => {
    router.push(`/tasks/${taskId}`);
  };
  
  return (
    <div className="space-y-4">
      {/* Sort tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilters(f => ({ ...f, sort: 'newest' }))}
          className={cn(
            'px-4 py-2 rounded-full text-sm font-medium transition-colors',
            filters.sort === 'newest'
              ? 'bg-brand-blue-500 text-white'
              : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
          )}
        >
          Newest
        </button>
        <button
          onClick={() => setFilters(f => ({ ...f, sort: 'highest_pay' }))}
          className={cn(
            'px-4 py-2 rounded-full text-sm font-medium transition-colors',
            filters.sort === 'highest_pay'
              ? 'bg-brand-blue-500 text-white'
              : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
          )}
        >
          Highest Pay
        </button>
        
        {/* Filter toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            'ml-auto px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-1',
            showFilters
              ? 'bg-brand-gold-500 text-brand-blue-900'
              : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
          )}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Filters
        </button>
      </div>
      
      {/* Filter panel */}
      {showFilters && (
        <div className="card p-4 animate-slide-down">
          <div className="grid grid-cols-2 gap-4">
            {/* Category filter */}
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">
                Category
              </label>
              <select
                value={filters.category}
                onChange={(e) => setFilters(f => ({ 
                  ...f, 
                  category: e.target.value as TaskCategory | 'ALL' 
                }))}
                className="input text-sm"
              >
                <option value="ALL">All Categories</option>
                {CATEGORY_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.icon} {opt.label}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Time window filter */}
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">
                When
              </label>
              <select
                value={filters.timeWindow}
                onChange={(e) => setFilters(f => ({ 
                  ...f, 
                  timeWindow: e.target.value as TimeWindow | 'ALL' 
                }))}
                className="input text-sm"
              >
                <option value="ALL">Any Time</option>
                {TIME_WINDOW_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Min price filter */}
            <div className="col-span-2">
              <label className="block text-xs font-medium text-neutral-500 mb-1">
                Minimum Pay
              </label>
              <select
                value={filters.minPrice || ''}
                onChange={(e) => setFilters(f => ({ 
                  ...f, 
                  minPrice: e.target.value ? parseInt(e.target.value) : null 
                }))}
                className="input text-sm"
              >
                <option value="">Any Amount</option>
                <option value="1000">$10+</option>
                <option value="2000">$20+</option>
                <option value="5000">$50+</option>
                <option value="10000">$100+</option>
              </select>
            </div>
          </div>
          
          {/* Clear filters */}
          <button
            onClick={() => setFilters({
              category: 'ALL',
              timeWindow: 'ALL',
              minPrice: null,
              sort: 'newest',
            })}
            className="mt-4 text-sm text-brand-blue-600 hover:text-brand-blue-700"
          >
            Clear all filters
          </button>
        </div>
      )}
      
      {/* Loading indicator */}
      {isPending && (
        <div className="text-center py-4">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-brand-blue-500 border-t-transparent"></div>
        </div>
      )}
      
      {/* Task list */}
      {filteredTasks.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">🔍</div>
          <p className="text-neutral-600 font-medium">No tasks found</p>
          <p className="text-sm text-neutral-400 mt-1">
            {filters.category !== 'ALL' || filters.timeWindow !== 'ALL' || filters.minPrice
              ? 'Try adjusting your filters'
              : 'Check back later for new tasks'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task, index) => (
            <div
              key={task.id}
              className="animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <TaskCard
                task={task}
                currentUserId={currentUserId}
                onAccept={handleAccept}
                onClick={handleTaskClick}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

