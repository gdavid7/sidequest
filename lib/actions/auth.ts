/**
 * =============================================================================
 * Auth Server Actions
 * =============================================================================
 * 
 * Server actions for authentication-related operations.
 * 
 * WHY SERVER ACTIONS?
 * - Runs on the server (can't be bypassed by client)
 * - Direct database access without exposing credentials
 * - Automatic request validation and error handling
 * - Type-safe with TypeScript
 */

'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { ActionResult, Profile } from '@/lib/types';

/**
 * Accept community rules for a user.
 * 
 * Called when a new user accepts the community guidelines on /rules.
 * 
 * SECURITY CHECKS:
 * 1. Verify the requesting user matches the userId (can't accept for someone else)
 * 2. User must be authenticated
 * 
 * @param userId - The user ID to update
 */
export async function acceptRules(userId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    
    // SECURITY: Verify the current user matches the userId
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }
    
    if (user.id !== userId) {
      // Trying to accept rules for someone else - denied!
      console.error('User tried to accept rules for different user:', {
        currentUser: user.id,
        targetUser: userId,
      });
      return { success: false, error: 'Unauthorized' };
    }
    
    // Update the profile
    const { error } = await supabase
      .from('profiles')
      .update({ accepted_rules: true })
      .eq('id', userId);
    
    if (error) {
      console.error('Failed to accept rules:', error);
      return { success: false, error: 'Failed to save. Please try again.' };
    }
    
    // Revalidate pages that might show the user's status
    revalidatePath('/');
    
    return { success: true };
  } catch (error) {
    console.error('acceptRules error:', error);
    return { success: false, error: 'Something went wrong' };
  }
}

/**
 * Update user's display name.
 * 
 * SECURITY CHECKS:
 * 1. User must be authenticated
 * 2. User can only update their own profile (enforced by RLS too)
 * 
 * @param displayName - The new display name
 */
export async function updateDisplayName(displayName: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }
    
    // Validate display name
    const trimmed = displayName.trim();
    if (trimmed.length > 50) {
      return { success: false, error: 'Display name must be 50 characters or less' };
    }
    
    // Update profile (RLS ensures user can only update their own)
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: trimmed || null })
      .eq('id', user.id);
    
    if (error) {
      console.error('Failed to update display name:', error);
      return { success: false, error: 'Failed to save' };
    }
    
    revalidatePath('/profile');
    revalidatePath('/');
    
    return { success: true };
  } catch (error) {
    console.error('updateDisplayName error:', error);
    return { success: false, error: 'Something went wrong' };
  }
}

/**
 * Sign out the current user.
 * 
 * Clears the session cookie and redirects to login.
 */
export async function signOut(): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('Sign out error:', error);
      return { success: false, error: 'Failed to sign out' };
    }
    
    return { success: true };
  } catch (error) {
    console.error('signOut error:', error);
    return { success: false, error: 'Something went wrong' };
  }
}

/**
 * Get the current user's profile.
 * 
 * Returns null if not authenticated.
 */
export async function getCurrentProfile(): Promise<ActionResult<Profile | null>> {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: true, data: null };
    }
    
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (error) {
      console.error('Failed to get profile:', error);
      return { success: false, error: 'Failed to load profile' };
    }
    
    return { success: true, data: profile };
  } catch (error) {
    console.error('getCurrentProfile error:', error);
    return { success: false, error: 'Something went wrong' };
  }
}

