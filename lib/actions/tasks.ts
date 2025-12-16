/**
 * =============================================================================
 * Task Server Actions
 * =============================================================================
 * 
 * Server actions for task CRUD operations.
 * These run on the server and enforce all business rules.
 * 
 * SECURITY MODEL:
 * - All actions verify the current user
 * - RLS provides additional protection at the database level
 * - We validate inputs server-side (client validation is for UX only)
 * 
 * EXTENSION POINTS:
 * - [PAYMENT] Add Stripe payment hold when accepting
 * - [PAYMENT] Release payment on completion
 * - [MODERATION] Add content filtering before insert
 * - [NOTIFICATIONS] Send push/email notifications
 */

'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { 
  ActionResult, 
  Task, 
  TaskCategory, 
  TimeWindow,
  TaskWithPoster,
  TaskWithDetails,
  TaskFilters,
  PRICE_LIMITS,
  VALIDATION
} from '@/lib/types';

// =============================================================================
// CREATE TASK
// =============================================================================

interface CreateTaskInput {
  title: string;
  description: string;
  category: TaskCategory;
  location_text: string;
  time_window: TimeWindow;
  scheduled_at?: string | null;
  price_cents: number;
}

/**
 * Create a new task.
 * 
 * SECURITY CHECKS:
 * 1. User must be authenticated
 * 2. User must have accepted rules
 * 3. Input validation (length, price range, etc.)
 * 
 * WHY VALIDATE SERVER-SIDE?
 * Client validation can be bypassed. We need to ensure all tasks
 * meet our requirements regardless of how the request was made.
 * 
 * @param input - Task data
 */
export async function createTask(input: CreateTaskInput): Promise<ActionResult<Task>> {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }
    
    // Verify user has accepted rules
    const { data: profile } = await supabase
      .from('profiles')
      .select('accepted_rules')
      .eq('id', user.id)
      .single();
    
    if (!profile?.accepted_rules) {
      return { success: false, error: 'You must accept the rules before posting' };
    }
    
    // Validate inputs
    const validationError = validateTaskInput(input);
    if (validationError) {
      return { success: false, error: validationError };
    }
    
    // [EXTENSION] Content moderation would go here
    // e.g., await moderateContent(input.title, input.description)
    
    // Create the task
    const { data: task, error } = await supabase
      .from('tasks')
      .insert({
        poster_id: user.id,
        status: 'OPEN',
        title: input.title.trim(),
        description: input.description.trim(),
        category: input.category,
        location_text: input.location_text.trim(),
        time_window: input.time_window,
        scheduled_at: input.time_window === 'SCHEDULED' ? input.scheduled_at : null,
        price_cents: input.price_cents,
      })
      .select()
      .single();
    
    if (error) {
      console.error('Failed to create task:', error);
      return { success: false, error: 'Failed to create task' };
    }
    
    // Revalidate the task feed
    revalidatePath('/');
    
    return { success: true, data: task };
  } catch (error) {
    console.error('createTask error:', error);
    return { success: false, error: 'Something went wrong' };
  }
}

/**
 * Validate task input fields.
 * Returns an error message or null if valid.
 */
function validateTaskInput(input: CreateTaskInput): string | null {
  // Title
  if (!input.title || input.title.trim().length === 0) {
    return 'Title is required';
  }
  if (input.title.length > 80) {
    return 'Title must be 80 characters or less';
  }
  
  // Description
  if (!input.description || input.description.trim().length === 0) {
    return 'Description is required';
  }
  if (input.description.length > 1000) {
    return 'Description must be 1000 characters or less';
  }
  
  // Location
  if (!input.location_text || input.location_text.trim().length === 0) {
    return 'Location is required';
  }
  if (input.location_text.length > 120) {
    return 'Location must be 120 characters or less';
  }
  
  // Price
  if (input.price_cents < 500) {
    return 'Minimum price is $5.00';
  }
  if (input.price_cents > 50000) {
    return 'Maximum price is $500.00';
  }
  
  // Scheduled time
  if (input.time_window === 'SCHEDULED') {
    if (!input.scheduled_at) {
      return 'Scheduled time is required';
    }
    const scheduledDate = new Date(input.scheduled_at);
    if (scheduledDate <= new Date()) {
      return 'Scheduled time must be in the future';
    }
  }
  
  return null;
}

// =============================================================================
// UPDATE TASK
// =============================================================================

interface UpdateTaskInput {
  title?: string;
  description?: string;
  price_cents?: number;
}

/**
 * Update a task (only while OPEN).
 * 
 * WHY ONLY WHILE OPEN?
 * Prevents "bait and switch" - once someone accepts, the terms are locked.
 * The worker agreed to the original task details.
 * 
 * SECURITY CHECKS:
 * 1. User must be the poster
 * 2. Task must be OPEN
 */
export async function updateTask(
  taskId: string, 
  input: UpdateTaskInput
): Promise<ActionResult<Task>> {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }
    
    // Fetch the task to verify ownership and status
    const { data: task } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single();
    
    if (!task) {
      return { success: false, error: 'Task not found' };
    }
    
    if (task.poster_id !== user.id) {
      return { success: false, error: 'You can only edit your own tasks' };
    }
    
    if (task.status !== 'OPEN') {
      return { success: false, error: 'Can only edit tasks that are still open' };
    }
    
    // Validate inputs
    if (input.title && input.title.length > 80) {
      return { success: false, error: 'Title must be 80 characters or less' };
    }
    if (input.description && input.description.length > 1000) {
      return { success: false, error: 'Description must be 1000 characters or less' };
    }
    if (input.price_cents !== undefined) {
      if (input.price_cents < 500 || input.price_cents > 50000) {
        return { success: false, error: 'Price must be between $5 and $500' };
      }
    }
    
    // Update the task
    const { data: updatedTask, error } = await supabase
      .from('tasks')
      .update({
        ...(input.title && { title: input.title.trim() }),
        ...(input.description && { description: input.description.trim() }),
        ...(input.price_cents !== undefined && { price_cents: input.price_cents }),
      })
      .eq('id', taskId)
      .select()
      .single();
    
    if (error) {
      console.error('Failed to update task:', error);
      return { success: false, error: 'Failed to update task' };
    }
    
    revalidatePath('/');
    revalidatePath(`/tasks/${taskId}`);
    
    return { success: true, data: updatedTask };
  } catch (error) {
    console.error('updateTask error:', error);
    return { success: false, error: 'Something went wrong' };
  }
}

// =============================================================================
// ACCEPT TASK
// =============================================================================

/**
 * Accept a task as a worker.
 * 
 * WHAT HAPPENS:
 * 1. Set accepted_by_user_id to current user
 * 2. Set status to ACCEPTED
 * 3. Set accepted_at timestamp
 * 4. Insert SYSTEM message "Task accepted"
 * 
 * SECURITY CHECKS:
 * 1. User must be authenticated
 * 2. User must have accepted rules
 * 3. User cannot be the poster (no self-dealing)
 * 4. Task must be OPEN
 * 5. Users cannot be blocking each other
 * 
 * [EXTENSION] Payment would be captured here
 */
export async function acceptTask(taskId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }
    
    // Verify user has accepted rules
    const { data: profile } = await supabase
      .from('profiles')
      .select('accepted_rules')
      .eq('id', user.id)
      .single();
    
    if (!profile?.accepted_rules) {
      return { success: false, error: 'You must accept the rules before accepting tasks' };
    }
    
    // Fetch the task
    const { data: task } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single();
    
    if (!task) {
      return { success: false, error: 'Task not found' };
    }
    
    // Can't accept your own task
    if (task.poster_id === user.id) {
      return { success: false, error: 'You cannot accept your own task' };
    }
    
    // Task must be open
    if (task.status !== 'OPEN') {
      return { success: false, error: 'This task is no longer available' };
    }
    
    // Check for blocks
    const { data: blocked } = await supabase
      .rpc('is_blocked', { viewer_id: user.id, other_id: task.poster_id });
    
    if (blocked) {
      return { success: false, error: 'Unable to accept this task' };
    }
    
    // [EXTENSION] Stripe payment hold would go here
    // const paymentIntent = await stripe.paymentIntents.create({
    //   amount: task.price_cents,
    //   currency: 'usd',
    //   capture_method: 'manual', // Hold, don't capture yet
    // });
    
    // Update the task
    const { error: updateError } = await supabase
      .from('tasks')
      .update({
        accepted_by_user_id: user.id,
        status: 'ACCEPTED',
        accepted_at: new Date().toISOString(),
      })
      .eq('id', taskId)
      .eq('status', 'OPEN'); // Extra safety: only update if still OPEN
    
    if (updateError) {
      console.error('Failed to accept task:', updateError);
      return { success: false, error: 'Failed to accept task. It may have already been taken.' };
    }
    
    // Insert system message
    await supabase
      .from('messages')
      .insert({
        task_id: taskId,
        sender_id: user.id,
        type: 'SYSTEM',
        body: 'Task accepted! You can now chat to coordinate details.',
      });
    
    revalidatePath('/');
    revalidatePath(`/tasks/${taskId}`);
    revalidatePath('/my-tasks');
    
    return { success: true };
  } catch (error) {
    console.error('acceptTask error:', error);
    return { success: false, error: 'Something went wrong' };
  }
}

// =============================================================================
// CANCEL TASK
// =============================================================================

/**
 * Cancel a task.
 * 
 * WHO CAN CANCEL:
 * - Poster: if OPEN or ACCEPTED
 * - Worker: if ACCEPTED
 * 
 * WHY ALLOW CANCELLATION?
 * Life happens. Both parties should be able to back out if needed.
 * However, we track cancellation for reputation purposes.
 * 
 * [EXTENSION] Track cancellation rate, penalize frequent cancellers
 * [EXTENSION] Refund payment on cancellation
 */
export async function cancelTask(taskId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }
    
    // Fetch the task
    const { data: task } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single();
    
    if (!task) {
      return { success: false, error: 'Task not found' };
    }
    
    // Check permissions
    const isPoster = task.poster_id === user.id;
    const isWorker = task.accepted_by_user_id === user.id;
    
    if (!isPoster && !isWorker) {
      return { success: false, error: 'You cannot cancel this task' };
    }
    
    // Check status
    if (task.status === 'COMPLETE') {
      return { success: false, error: 'Cannot cancel a completed task' };
    }
    if (task.status === 'CANCELED') {
      return { success: false, error: 'Task is already canceled' };
    }
    
    // Worker can only cancel if ACCEPTED
    if (isWorker && task.status !== 'ACCEPTED') {
      return { success: false, error: 'Cannot cancel this task' };
    }
    
    // [EXTENSION] Refund payment here
    
    // Update the task
    const { error: updateError } = await supabase
      .from('tasks')
      .update({
        status: 'CANCELED',
        canceled_at: new Date().toISOString(),
      })
      .eq('id', taskId);
    
    if (updateError) {
      console.error('Failed to cancel task:', updateError);
      return { success: false, error: 'Failed to cancel task' };
    }
    
    // Add system message
    const cancellerRole = isPoster ? 'poster' : 'worker';
    await supabase
      .from('messages')
      .insert({
        task_id: taskId,
        sender_id: user.id,
        type: 'SYSTEM',
        body: `Task canceled by the ${cancellerRole}.`,
      });
    
    revalidatePath('/');
    revalidatePath(`/tasks/${taskId}`);
    revalidatePath('/my-tasks');
    
    return { success: true };
  } catch (error) {
    console.error('cancelTask error:', error);
    return { success: false, error: 'Something went wrong' };
  }
}

// =============================================================================
// COMPLETE TASK
// =============================================================================

/**
 * Mark a task as complete.
 * 
 * ONLY THE POSTER can mark complete.
 * This confirms they're satisfied with the work.
 * 
 * [EXTENSION] Release payment to worker here
 * [EXTENSION] Trigger rating prompts
 */
export async function completeTask(taskId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }
    
    // Fetch the task
    const { data: task } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single();
    
    if (!task) {
      return { success: false, error: 'Task not found' };
    }
    
    // Only poster can complete
    if (task.poster_id !== user.id) {
      return { success: false, error: 'Only the task poster can mark it complete' };
    }
    
    // Task must be accepted
    if (task.status !== 'ACCEPTED') {
      return { success: false, error: 'Task must be accepted before it can be completed' };
    }
    
    // [EXTENSION] Capture payment here
    // await stripe.paymentIntents.capture(task.stripe_payment_intent_id);
    
    // Update the task
    const { error: updateError } = await supabase
      .from('tasks')
      .update({
        status: 'COMPLETE',
        completed_at: new Date().toISOString(),
      })
      .eq('id', taskId);
    
    if (updateError) {
      console.error('Failed to complete task:', updateError);
      return { success: false, error: 'Failed to complete task' };
    }
    
    // Add system message
    await supabase
      .from('messages')
      .insert({
        task_id: taskId,
        sender_id: user.id,
        type: 'SYSTEM',
        body: 'Task marked as complete! 🎉 Don\'t forget to rate each other.',
      });
    
    revalidatePath('/');
    revalidatePath(`/tasks/${taskId}`);
    revalidatePath('/my-tasks');
    
    return { success: true };
  } catch (error) {
    console.error('completeTask error:', error);
    return { success: false, error: 'Something went wrong' };
  }
}

// =============================================================================
// GET TASKS (for feed)
// =============================================================================

/**
 * Get tasks for the feed with filters.
 * 
 * This is read-only, so it's okay to call from client components.
 * RLS ensures users only see tasks they're allowed to see.
 */
export async function getTasks(filters?: Partial<TaskFilters>): Promise<ActionResult<TaskWithPoster[]>> {
  try {
    const supabase = await createClient();
    
    // Build query
    let query = supabase
      .from('tasks')
      .select(`
        *,
        poster:profiles!tasks_poster_id_fkey(id, display_name, email)
      `)
      .in('status', ['OPEN', 'ACCEPTED']);
    
    // Apply filters
    if (filters?.category && filters.category !== 'ALL') {
      query = query.eq('category', filters.category);
    }
    
    if (filters?.timeWindow && filters.timeWindow !== 'ALL') {
      query = query.eq('time_window', filters.timeWindow);
    }
    
    if (filters?.minPrice) {
      query = query.gte('price_cents', filters.minPrice);
    }
    
    // Apply sorting
    if (filters?.sort === 'highest_pay') {
      query = query.order('price_cents', { ascending: false });
    } else {
      // Default: newest first
      query = query.order('created_at', { ascending: false });
    }
    
    // Limit results
    query = query.limit(50);
    
    const { data: tasks, error } = await query;
    
    if (error) {
      console.error('Failed to fetch tasks:', error);
      return { success: false, error: 'Failed to load tasks' };
    }
    
    return { success: true, data: tasks || [] };
  } catch (error) {
    console.error('getTasks error:', error);
    return { success: false, error: 'Something went wrong' };
  }
}

/**
 * Get a single task with full details.
 */
export async function getTask(taskId: string): Promise<ActionResult<TaskWithDetails>> {
  try {
    const supabase = await createClient();
    
    const { data: task, error } = await supabase
      .from('tasks')
      .select(`
        *,
        poster:profiles!tasks_poster_id_fkey(id, display_name, email),
        accepted_by:profiles!tasks_accepted_by_user_id_fkey(id, display_name, email)
      `)
      .eq('id', taskId)
      .single();
    
    if (error || !task) {
      return { success: false, error: 'Task not found' };
    }
    
    // Get ratings for poster and accepted worker
    const { data: posterRating } = await supabase
      .rpc('get_user_rating', { user_id: task.poster_id });
    
    let acceptedByRating = null;
    if (task.accepted_by_user_id) {
      const { data } = await supabase
        .rpc('get_user_rating', { user_id: task.accepted_by_user_id });
      acceptedByRating = data;
    }
    
    return {
      success: true,
      data: {
        ...task,
        poster_rating: posterRating?.[0] || null,
        accepted_by_rating: acceptedByRating?.[0] || null,
      },
    };
  } catch (error) {
    console.error('getTask error:', error);
    return { success: false, error: 'Something went wrong' };
  }
}

/**
 * Get user's tasks (posted or accepted).
 */
export async function getMyTasks(): Promise<ActionResult<{
  posted: TaskWithPoster[];
  accepted: TaskWithPoster[];
}>> {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }
    
    // Get tasks I posted
    const { data: posted, error: postedError } = await supabase
      .from('tasks')
      .select(`
        *,
        poster:profiles!tasks_poster_id_fkey(id, display_name, email)
      `)
      .eq('poster_id', user.id)
      .order('created_at', { ascending: false });
    
    if (postedError) {
      console.error('Failed to fetch posted tasks:', postedError);
    }
    
    // Get tasks I accepted
    const { data: accepted, error: acceptedError } = await supabase
      .from('tasks')
      .select(`
        *,
        poster:profiles!tasks_poster_id_fkey(id, display_name, email)
      `)
      .eq('accepted_by_user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (acceptedError) {
      console.error('Failed to fetch accepted tasks:', acceptedError);
    }
    
    return {
      success: true,
      data: {
        posted: posted || [],
        accepted: accepted || [],
      },
    };
  } catch (error) {
    console.error('getMyTasks error:', error);
    return { success: false, error: 'Something went wrong' };
  }
}

