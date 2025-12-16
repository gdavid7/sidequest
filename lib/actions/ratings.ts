/**
 * =============================================================================
 * Rating Server Actions
 * =============================================================================
 * 
 * Server actions for the rating system.
 * 
 * RATING RULES:
 * - Only participants can rate (poster or accepted worker)
 * - Can only rate after task is COMPLETE
 * - Each person can rate once per task
 * - Poster rates worker, worker rates poster
 */

'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { ActionResult, Rating } from '@/lib/types';

interface SubmitRatingInput {
  taskId: string;
  stars: number;
  comment?: string;
}

/**
 * Submit a rating for the other participant.
 * 
 * SECURITY CHECKS:
 * 1. User must be authenticated
 * 2. User must be poster OR accepted worker
 * 3. Task must be COMPLETE
 * 4. User hasn't already rated this task
 * 5. Stars must be 1-5
 */
export async function submitRating(input: SubmitRatingInput): Promise<ActionResult<Rating>> {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }
    
    // Validate stars
    if (!Number.isInteger(input.stars) || input.stars < 1 || input.stars > 5) {
      return { success: false, error: 'Rating must be 1-5 stars' };
    }
    
    // Validate comment
    if (input.comment && input.comment.length > 500) {
      return { success: false, error: 'Comment must be 500 characters or less' };
    }
    
    // Fetch the task
    const { data: task } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', input.taskId)
      .single();
    
    if (!task) {
      return { success: false, error: 'Task not found' };
    }
    
    // Task must be complete
    if (task.status !== 'COMPLETE') {
      return { success: false, error: 'Can only rate completed tasks' };
    }
    
    // Must be a participant
    const isPoster = task.poster_id === user.id;
    const isWorker = task.accepted_by_user_id === user.id;
    
    if (!isPoster && !isWorker) {
      return { success: false, error: 'You are not a participant in this task' };
    }
    
    // Determine who we're rating (the other person)
    const rateeId = isPoster ? task.accepted_by_user_id : task.poster_id;
    
    if (!rateeId) {
      return { success: false, error: 'No one to rate' };
    }
    
    // Check if already rated
    const { data: existingRating } = await supabase
      .from('ratings')
      .select('id')
      .eq('task_id', input.taskId)
      .eq('rater_id', user.id)
      .single();
    
    if (existingRating) {
      return { success: false, error: 'You have already rated this task' };
    }
    
    // Insert the rating
    const { data: rating, error } = await supabase
      .from('ratings')
      .insert({
        task_id: input.taskId,
        rater_id: user.id,
        ratee_id: rateeId,
        stars: input.stars,
        comment: input.comment?.trim() || null,
      })
      .select()
      .single();
    
    if (error) {
      console.error('Failed to submit rating:', error);
      return { success: false, error: 'Failed to submit rating' };
    }
    
    revalidatePath(`/tasks/${input.taskId}`);
    revalidatePath('/profile');
    
    return { success: true, data: rating };
  } catch (error) {
    console.error('submitRating error:', error);
    return { success: false, error: 'Something went wrong' };
  }
}

/**
 * Check if the current user has rated a task.
 */
export async function hasRated(taskId: string): Promise<ActionResult<boolean>> {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: true, data: false };
    }
    
    const { data: rating } = await supabase
      .from('ratings')
      .select('id')
      .eq('task_id', taskId)
      .eq('rater_id', user.id)
      .single();
    
    return { success: true, data: !!rating };
  } catch (error) {
    console.error('hasRated error:', error);
    return { success: false, error: 'Something went wrong' };
  }
}

/**
 * Get ratings received by a user.
 */
export async function getUserRatings(userId: string): Promise<ActionResult<{
  ratings: Rating[];
  average: number | null;
  count: number;
}>> {
  try {
    const supabase = await createClient();
    
    // Get all ratings for this user
    const { data: ratings, error } = await supabase
      .from('ratings')
      .select('*')
      .eq('ratee_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Failed to fetch ratings:', error);
      return { success: false, error: 'Failed to load ratings' };
    }
    
    // Calculate average
    const count = ratings?.length || 0;
    const average = count > 0
      ? ratings!.reduce((sum, r) => sum + r.stars, 0) / count
      : null;
    
    return {
      success: true,
      data: {
        ratings: ratings || [],
        average: average !== null ? Math.round(average * 10) / 10 : null,
        count,
      },
    };
  } catch (error) {
    console.error('getUserRatings error:', error);
    return { success: false, error: 'Something went wrong' };
  }
}

