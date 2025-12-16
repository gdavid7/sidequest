/**
 * =============================================================================
 * Block Server Actions
 * =============================================================================
 * 
 * Server actions for user blocking.
 * 
 * BLOCKING IS A "MINIMAL SAFETY VALVE"
 * ====================================
 * 
 * This MVP doesn't have a full moderation system (no reports, no admin dashboard,
 * no content filters). Instead, we give users the power to protect themselves
 * by blocking problematic users.
 * 
 * When A blocks B:
 * - A won't see B's tasks
 * - B won't see A's tasks
 * - They cannot message each other
 * 
 * EXTENSION POINTS:
 * - [MODERATION] Add a reports table for serious issues
 * - [MODERATION] Add admin dashboard to review reports
 * - [MODERATION] Add content filtering (profanity, spam, etc.)
 * - [MODERATION] Track block patterns (many blocks = red flag)
 */

'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { ActionResult, Block } from '@/lib/types';

/**
 * Block a user.
 * 
 * SECURITY CHECKS:
 * 1. User must be authenticated
 * 2. Can't block yourself
 * 3. Can't block someone already blocked
 * 
 * @param blockedId - The user ID to block
 */
export async function blockUser(blockedId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }
    
    // Can't block yourself
    if (user.id === blockedId) {
      return { success: false, error: 'You cannot block yourself' };
    }
    
    // Check if already blocked
    const { data: existingBlock } = await supabase
      .from('blocks')
      .select('id')
      .eq('blocker_id', user.id)
      .eq('blocked_id', blockedId)
      .single();
    
    if (existingBlock) {
      return { success: false, error: 'User is already blocked' };
    }
    
    // Verify the user exists
    const { data: blockedUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', blockedId)
      .single();
    
    if (!blockedUser) {
      return { success: false, error: 'User not found' };
    }
    
    // Create the block
    const { error } = await supabase
      .from('blocks')
      .insert({
        blocker_id: user.id,
        blocked_id: blockedId,
      });
    
    if (error) {
      console.error('Failed to block user:', error);
      return { success: false, error: 'Failed to block user' };
    }
    
    // [EXTENSION] Track blocking patterns here
    // If a user gets blocked by many people, that's a red flag
    // await trackBlockPattern(blockedId);
    
    revalidatePath('/');
    
    return { success: true };
  } catch (error) {
    console.error('blockUser error:', error);
    return { success: false, error: 'Something went wrong' };
  }
}

/**
 * Unblock a user.
 * 
 * @param blockedId - The user ID to unblock
 */
export async function unblockUser(blockedId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }
    
    const { error } = await supabase
      .from('blocks')
      .delete()
      .eq('blocker_id', user.id)
      .eq('blocked_id', blockedId);
    
    if (error) {
      console.error('Failed to unblock user:', error);
      return { success: false, error: 'Failed to unblock user' };
    }
    
    revalidatePath('/');
    
    return { success: true };
  } catch (error) {
    console.error('unblockUser error:', error);
    return { success: false, error: 'Something went wrong' };
  }
}

/**
 * Check if the current user has blocked someone.
 */
export async function isUserBlocked(userId: string): Promise<ActionResult<boolean>> {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: true, data: false };
    }
    
    const { data: block } = await supabase
      .from('blocks')
      .select('id')
      .eq('blocker_id', user.id)
      .eq('blocked_id', userId)
      .single();
    
    return { success: true, data: !!block };
  } catch (error) {
    console.error('isUserBlocked error:', error);
    return { success: false, error: 'Something went wrong' };
  }
}

/**
 * Get list of users the current user has blocked.
 */
export async function getBlockedUsers(): Promise<ActionResult<Block[]>> {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }
    
    const { data: blocks, error } = await supabase
      .from('blocks')
      .select('*')
      .eq('blocker_id', user.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Failed to fetch blocked users:', error);
      return { success: false, error: 'Failed to load blocked users' };
    }
    
    return { success: true, data: blocks || [] };
  } catch (error) {
    console.error('getBlockedUsers error:', error);
    return { success: false, error: 'Something went wrong' };
  }
}

