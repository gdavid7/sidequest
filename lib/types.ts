/**
 * =============================================================================
 * Sidequest Type Definitions
 * =============================================================================
 * 
 * Central type definitions for the entire application.
 * These types mirror our database schema and provide type safety throughout.
 * 
 * IMPORTANT: Keep these in sync with the database schema!
 * If you add columns to the database, add them here too.
 */

// =============================================================================
// Database Enums
// =============================================================================

/**
 * Task status lifecycle:
 * OPEN -> ACCEPTED -> COMPLETE
 *           |
 *           v
 *       CANCELED (can happen from OPEN or ACCEPTED)
 */
export type TaskStatus = 'OPEN' | 'ACCEPTED' | 'COMPLETE' | 'CANCELED';

/**
 * Task categories - these help users find relevant tasks.
 * 
 * EXTENSION POINT: Adding new categories requires:
 * 1. Adding to this type
 * 2. Adding to the database enum (migration)
 * 3. Adding styling in globals.css (.category-xxx)
 * 4. Adding to the CATEGORY_OPTIONS array below
 */
export type TaskCategory = 
  | 'ERRAND' 
  | 'DELIVERY' 
  | 'MOVING' 
  | 'TUTORING' 
  | 'CLEANING' 
  | 'OTHER';

/**
 * Time window for task completion.
 * - NOW: Need help immediately (within 1-2 hours)
 * - TODAY: Need help sometime today
 * - THIS_WEEK: Flexible, can be done this week
 * - SCHEDULED: Specific date/time (requires scheduled_at)
 */
export type TimeWindow = 'NOW' | 'TODAY' | 'THIS_WEEK' | 'SCHEDULED';

/**
 * Message types in chat:
 * - TEXT: Regular user message
 * - SYSTEM: Auto-generated (e.g., "Task accepted", "Task completed")
 */
export type MessageType = 'TEXT' | 'SYSTEM';

// =============================================================================
// Database Models
// =============================================================================

/**
 * User profile - created on first login.
 * 
 * SECURITY NOTE: The id is the same as auth.users.id (Supabase auth).
 * We store minimal profile data here; most auth data is in Supabase's auth schema.
 */
export interface Profile {
  id: string;                    // UUID, matches auth.users.id
  email: string;                 // Always @uci.edu
  display_name: string | null;   // Optional friendly name
  accepted_rules: boolean;       // Must be true to use the app
  created_at: string;            // ISO timestamp
}

/**
 * Task - the core entity of the marketplace.
 * 
 * Lifecycle:
 * 1. Poster creates task (status: OPEN)
 * 2. Worker accepts task (status: ACCEPTED, accepted_by_user_id set)
 * 3a. Poster marks complete (status: COMPLETE) OR
 * 3b. Either party cancels (status: CANCELED)
 */
export interface Task {
  id: string;                           // UUID
  poster_id: string;                    // FK to profiles.id
  accepted_by_user_id: string | null;   // FK to profiles.id (null when OPEN)
  status: TaskStatus;
  title: string;                        // Max 80 chars
  description: string;                  // Max 1000 chars
  category: TaskCategory;
  location_text: string;                // Free-text UCI location (max 120)
  time_window: TimeWindow;
  scheduled_at: string | null;          // ISO timestamp (only if SCHEDULED)
  price_cents: number;                  // Stored in cents (500 = $5.00)
  created_at: string;                   // ISO timestamp
  accepted_at: string | null;           // When task was accepted
  completed_at: string | null;          // When task was completed
  canceled_at: string | null;           // When task was canceled
}

/**
 * Task with joined profile data - used in the feed.
 * This is what we get when we join tasks with profiles.
 */
export interface TaskWithPoster extends Task {
  poster: Pick<Profile, 'id' | 'display_name' | 'email'>;
  poster_rating?: { avg: number; count: number } | null;
}

/**
 * Task with full details including accepted worker.
 * Used on the task detail page.
 */
export interface TaskWithDetails extends TaskWithPoster {
  accepted_by?: Pick<Profile, 'id' | 'display_name' | 'email'> | null;
  accepted_by_rating?: { avg: number; count: number } | null;
}

/**
 * Chat message between poster and accepted worker.
 */
export interface Message {
  id: string;
  task_id: string;
  sender_id: string;
  type: MessageType;
  body: string;
  created_at: string;
}

/**
 * Message with sender profile data.
 */
export interface MessageWithSender extends Message {
  sender: Pick<Profile, 'id' | 'display_name' | 'email'>;
}

/**
 * Rating left after task completion.
 * Each participant can rate the other once per task.
 */
export interface Rating {
  id: string;
  task_id: string;
  rater_id: string;
  ratee_id: string;
  stars: number;           // 1-5
  comment: string | null;
  created_at: string;
}

/**
 * Block record - A has blocked B.
 * 
 * SECURITY NOTE: When A blocks B:
 * - A won't see B's tasks
 * - B won't see A's tasks
 * - They can't message each other
 * 
 * This is a "minimal safety valve" - not a full moderation system.
 */
export interface Block {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
}

// =============================================================================
// UI Constants
// =============================================================================

/**
 * Category options for dropdowns and filters.
 */
export const CATEGORY_OPTIONS: { value: TaskCategory; label: string; icon: string }[] = [
  { value: 'ERRAND', label: 'Errand', icon: '🏃' },
  { value: 'DELIVERY', label: 'Delivery', icon: '📦' },
  { value: 'MOVING', label: 'Moving', icon: '🚚' },
  { value: 'TUTORING', label: 'Tutoring', icon: '📚' },
  { value: 'CLEANING', label: 'Cleaning', icon: '🧹' },
  { value: 'OTHER', label: 'Other', icon: '✨' },
];

/**
 * Time window options for the post form.
 */
export const TIME_WINDOW_OPTIONS: { value: TimeWindow; label: string; description: string }[] = [
  { value: 'NOW', label: 'Now', description: 'Need help within 1-2 hours' },
  { value: 'TODAY', label: 'Today', description: 'Anytime today' },
  { value: 'THIS_WEEK', label: 'This Week', description: 'Flexible timing' },
  { value: 'SCHEDULED', label: 'Scheduled', description: 'Specific date/time' },
];

/**
 * Status display configuration.
 */
export const STATUS_CONFIG: Record<TaskStatus, { label: string; className: string }> = {
  OPEN: { label: 'Open', className: 'badge-open' },
  ACCEPTED: { label: 'Accepted', className: 'badge-accepted' },
  COMPLETE: { label: 'Complete', className: 'badge-complete' },
  CANCELED: { label: 'Canceled', className: 'badge-canceled' },
};

/**
 * Price constraints (in cents).
 */
export const PRICE_LIMITS = {
  MIN_CENTS: 500,    // $5.00
  MAX_CENTS: 50000,  // $500.00
} as const;

/**
 * Validation constraints.
 */
export const VALIDATION = {
  TITLE_MAX_LENGTH: 80,
  DESCRIPTION_MAX_LENGTH: 1000,
  LOCATION_MAX_LENGTH: 120,
  COMMENT_MAX_LENGTH: 500,
} as const;

// =============================================================================
// Utility Types
// =============================================================================

/**
 * Sort options for the task feed.
 */
export type SortOption = 'newest' | 'highest_pay';

/**
 * Filter state for the task feed.
 */
export interface TaskFilters {
  category: TaskCategory | 'ALL';
  timeWindow: TimeWindow | 'ALL';
  minPrice: number | null;
  sort: SortOption;
}

/**
 * API response wrapper for consistent error handling.
 */
export interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

