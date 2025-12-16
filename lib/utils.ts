/**
 * =============================================================================
 * Utility Functions
 * =============================================================================
 * 
 * Shared helper functions used throughout the app.
 */

import { clsx, type ClassValue } from 'clsx';

/**
 * Combines class names with clsx for conditional classes.
 * 
 * Usage:
 *   cn('base-class', condition && 'conditional-class', { 'object-syntax': true })
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/**
 * Formats price from cents to display string.
 * 
 * @example
 * formatPrice(1500) // "$15.00"
 * formatPrice(500)  // "$5.00"
 */
export function formatPrice(cents: number): string {
  const dollars = cents / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(dollars);
}

/**
 * Formats a date to a relative time string.
 * 
 * @example
 * formatRelativeTime(new Date()) // "just now"
 * formatRelativeTime(oneHourAgo) // "1 hour ago"
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  
  if (diffSec < 60) {
    return 'just now';
  } else if (diffMin < 60) {
    return `${diffMin} min${diffMin === 1 ? '' : 's'} ago`;
  } else if (diffHour < 24) {
    return `${diffHour} hour${diffHour === 1 ? '' : 's'} ago`;
  } else if (diffDay < 7) {
    return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`;
  } else if (diffWeek < 4) {
    return `${diffWeek} week${diffWeek === 1 ? '' : 's'} ago`;
  } else {
    return d.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  }
}

/**
 * Formats a date for display in task cards.
 * Shows time if today, otherwise shows date.
 */
export function formatTaskTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  
  if (isToday) {
    return d.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  }
  
  return d.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Validates that an email is a UCI email.
 * 
 * WHY @uci.edu SPECIFICALLY?
 * - Generic .edu check is insufficient (any university could sign up)
 * - We want ONLY UCI students/staff
 * - This creates a trusted, local community
 * - Important for safety: users can be identified if needed
 * 
 * SECURITY NOTE: Always validate server-side too!
 * Client validation is for UX only.
 */
export function isValidUCIEmail(email: string): boolean {
  // Case-insensitive check for @uci.edu domain
  const normalized = email.toLowerCase().trim();
  return normalized.endsWith('@uci.edu');
}

/**
 * Extracts the UCInetID from a UCI email.
 * 
 * @example
 * getUCINetID('jsmith@uci.edu') // 'jsmith'
 */
export function getUCINetID(email: string): string {
  return email.toLowerCase().split('@')[0];
}

/**
 * Gets a display name from a profile.
 * Falls back to UCInetID if no display name set.
 */
export function getDisplayName(profile: { 
  display_name: string | null; 
  email: string 
}): string {
  return profile.display_name || getUCINetID(profile.email);
}

/**
 * Truncates text to a maximum length with ellipsis.
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Debounce function for search inputs.
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Generates a random ID for optimistic updates.
 * Use crypto.randomUUID() when available.
 */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

