/**
 * =============================================================================
 * Post Task Page
 * =============================================================================
 * 
 * Form for creating a new task.
 * 
 * FEATURES:
 * - Input validation with immediate feedback
 * - Category and time window selection
 * - Price input with min/max constraints
 * - Optional scheduling for specific date/time
 */

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createTask } from '@/lib/actions/tasks';
import { CATEGORY_OPTIONS, TIME_WINDOW_OPTIONS, VALIDATION, PRICE_LIMITS } from '@/lib/types';
import type { TaskCategory, TimeWindow } from '@/lib/types';
import { cn } from '@/lib/utils';

export default function PostPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TaskCategory>('ERRAND');
  const [locationText, setLocationText] = useState('');
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('TODAY');
  const [scheduledAt, setScheduledAt] = useState('');
  const [priceDollars, setPriceDollars] = useState('');
  
  // Error state
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  
  /**
   * Validate a single field.
   */
  const validateField = (field: string, value: string): string | null => {
    switch (field) {
      case 'title':
        if (!value.trim()) return 'Title is required';
        if (value.length > VALIDATION.TITLE_MAX_LENGTH) {
          return `Title must be ${VALIDATION.TITLE_MAX_LENGTH} characters or less`;
        }
        return null;
      case 'description':
        if (!value.trim()) return 'Description is required';
        if (value.length > VALIDATION.DESCRIPTION_MAX_LENGTH) {
          return `Description must be ${VALIDATION.DESCRIPTION_MAX_LENGTH} characters or less`;
        }
        return null;
      case 'location':
        if (!value.trim()) return 'Location is required';
        if (value.length > VALIDATION.LOCATION_MAX_LENGTH) {
          return `Location must be ${VALIDATION.LOCATION_MAX_LENGTH} characters or less`;
        }
        return null;
      case 'price':
        const cents = Math.round(parseFloat(value || '0') * 100);
        if (isNaN(cents) || cents < PRICE_LIMITS.MIN_CENTS) {
          return `Minimum price is $${PRICE_LIMITS.MIN_CENTS / 100}`;
        }
        if (cents > PRICE_LIMITS.MAX_CENTS) {
          return `Maximum price is $${PRICE_LIMITS.MAX_CENTS / 100}`;
        }
        return null;
      default:
        return null;
    }
  };
  
  /**
   * Handle field blur for validation.
   */
  const handleBlur = (field: string, value: string) => {
    const error = validateField(field, value);
    setFieldErrors(prev => ({
      ...prev,
      [field]: error || '',
    }));
  };
  
  /**
   * Handle form submission.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Validate all fields
    const errors: Record<string, string> = {};
    const titleError = validateField('title', title);
    const descError = validateField('description', description);
    const locError = validateField('location', locationText);
    const priceError = validateField('price', priceDollars);
    
    if (titleError) errors.title = titleError;
    if (descError) errors.description = descError;
    if (locError) errors.location = locError;
    if (priceError) errors.price = priceError;
    
    if (timeWindow === 'SCHEDULED' && !scheduledAt) {
      errors.scheduledAt = 'Please select a date and time';
    }
    
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    
    startTransition(async () => {
      const result = await createTask({
        title: title.trim(),
        description: description.trim(),
        category,
        location_text: locationText.trim(),
        time_window: timeWindow,
        scheduled_at: timeWindow === 'SCHEDULED' ? new Date(scheduledAt).toISOString() : null,
        price_cents: Math.round(parseFloat(priceDollars) * 100),
      });
      
      if (result.success && result.data) {
        // Navigate to the new task
        router.push(`/tasks/${result.data.id}`);
      } else {
        setError(result.error || 'Failed to create task');
      }
    });
  };
  
  return (
    <div className="px-4 py-4">
      {/* Header */}
      <header className="mb-6">
        <button 
          onClick={() => router.back()}
          className="flex items-center gap-1 text-neutral-500 hover:text-neutral-700 mb-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <h1 className="text-2xl font-bold text-neutral-900">Post a Task</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Get help from fellow Anteaters
        </p>
      </header>
      
      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            What do you need help with? *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={(e) => handleBlur('title', e.target.value)}
            placeholder="e.g., Pick up package from Langson Library"
            className={cn('input', fieldErrors.title && 'input-error')}
            maxLength={VALIDATION.TITLE_MAX_LENGTH}
          />
          <div className="flex justify-between mt-1">
            {fieldErrors.title ? (
              <span className="text-xs text-red-500">{fieldErrors.title}</span>
            ) : (
              <span />
            )}
            <span className="text-xs text-neutral-400">
              {title.length}/{VALIDATION.TITLE_MAX_LENGTH}
            </span>
          </div>
        </div>
        
        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Details *
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={(e) => handleBlur('description', e.target.value)}
            placeholder="Provide more details about the task, any requirements, etc."
            className={cn('input min-h-[120px] resize-none', fieldErrors.description && 'input-error')}
            maxLength={VALIDATION.DESCRIPTION_MAX_LENGTH}
          />
          <div className="flex justify-between mt-1">
            {fieldErrors.description ? (
              <span className="text-xs text-red-500">{fieldErrors.description}</span>
            ) : (
              <span />
            )}
            <span className="text-xs text-neutral-400">
              {description.length}/{VALIDATION.DESCRIPTION_MAX_LENGTH}
            </span>
          </div>
        </div>
        
        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Category *
          </label>
          <div className="grid grid-cols-3 gap-2">
            {CATEGORY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setCategory(opt.value)}
                className={cn(
                  'p-3 rounded-xl border-2 text-center transition-all',
                  category === opt.value
                    ? 'border-brand-blue-500 bg-brand-blue-50'
                    : 'border-neutral-200 hover:border-neutral-300'
                )}
              >
                <span className="text-xl">{opt.icon}</span>
                <p className="text-xs mt-1 font-medium">{opt.label}</p>
              </button>
            ))}
          </div>
        </div>
        
        {/* Location */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Location at UCI *
          </label>
          <input
            type="text"
            value={locationText}
            onChange={(e) => setLocationText(e.target.value)}
            onBlur={(e) => handleBlur('location', e.target.value)}
            placeholder="e.g., Mesa Court, Student Center, Aldrich Park"
            className={cn('input', fieldErrors.location && 'input-error')}
            maxLength={VALIDATION.LOCATION_MAX_LENGTH}
          />
          {fieldErrors.location && (
            <span className="text-xs text-red-500 mt-1 block">{fieldErrors.location}</span>
          )}
        </div>
        
        {/* Time Window */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            When do you need this done? *
          </label>
          <div className="grid grid-cols-2 gap-2">
            {TIME_WINDOW_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTimeWindow(opt.value)}
                className={cn(
                  'p-3 rounded-xl border-2 text-left transition-all',
                  timeWindow === opt.value
                    ? 'border-brand-blue-500 bg-brand-blue-50'
                    : 'border-neutral-200 hover:border-neutral-300'
                )}
              >
                <p className="font-medium">{opt.label}</p>
                <p className="text-xs text-neutral-500 mt-0.5">{opt.description}</p>
              </button>
            ))}
          </div>
        </div>
        
        {/* Scheduled Date/Time (if SCHEDULED) */}
        {timeWindow === 'SCHEDULED' && (
          <div className="animate-slide-down">
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              When? *
            </label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              className={cn('input', fieldErrors.scheduledAt && 'input-error')}
            />
            {fieldErrors.scheduledAt && (
              <span className="text-xs text-red-500 mt-1 block">{fieldErrors.scheduledAt}</span>
            )}
          </div>
        )}
        
        {/* Price */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            How much will you pay? *
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 font-medium">
              $
            </span>
            <input
              type="number"
              value={priceDollars}
              onChange={(e) => setPriceDollars(e.target.value)}
              onBlur={(e) => handleBlur('price', e.target.value)}
              placeholder="0.00"
              min={PRICE_LIMITS.MIN_CENTS / 100}
              max={PRICE_LIMITS.MAX_CENTS / 100}
              step="0.01"
              className={cn('input pl-8', fieldErrors.price && 'input-error')}
            />
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            Min ${PRICE_LIMITS.MIN_CENTS / 100} • Max ${PRICE_LIMITS.MAX_CENTS / 100}
          </p>
          {fieldErrors.price && (
            <span className="text-xs text-red-500 mt-1 block">{fieldErrors.price}</span>
          )}
        </div>
        
        {/* Error message */}
        {error && (
          <div className="p-3 bg-red-50 text-red-800 text-sm rounded-xl border border-red-200">
            {error}
          </div>
        )}
        
        {/* Submit button */}
        <button
          type="submit"
          disabled={isPending}
          className="btn-primary w-full"
        >
          {isPending ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle 
                  className="opacity-25" 
                  cx="12" cy="12" r="10" 
                  stroke="currentColor" 
                  strokeWidth="4"
                  fill="none"
                />
                <path 
                  className="opacity-75" 
                  fill="currentColor" 
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Posting...
            </span>
          ) : (
            'Post Task'
          )}
        </button>
        
        {/* Info note */}
        <p className="text-xs text-neutral-400 text-center">
          By posting, you agree to pay the worker when the task is complete.
          Coordinate payment method (Venmo, Zelle, cash) via chat.
        </p>
      </form>
    </div>
  );
}

