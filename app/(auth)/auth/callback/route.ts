/**
 * =============================================================================
 * Auth Callback Route
 * =============================================================================
 * 
 * This route handles the OAuth/magic link callback from Supabase.
 * 
 * Flow:
 * 1. User clicks magic link in email
 * 2. Supabase redirects to this route with a code
 * 3. We exchange the code for a session
 * 4. We create/update the user's profile
 * 5. Redirect to home or rules page
 * 
 * SECURITY NOTE:
 * The code exchange happens server-side, so the tokens are never
 * exposed to the client until they're safely stored in cookies.
 */

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { isValidUCIEmail } from '@/lib/utils';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  // If there's an error in the URL (e.g., user denied access)
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');
  
  // Handle errors from Supabase
  if (error) {
    console.error('Auth callback error:', error, errorDescription);
    // Redirect to login with error message
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(errorDescription || error)}`
    );
  }
  
  // If no code, something went wrong
  if (!code) {
    console.error('Auth callback: No code provided');
    return NextResponse.redirect(`${origin}/login?error=No+authorization+code+provided`);
  }
  
  const supabase = await createClient();
  
  /**
   * Exchange the code for a session.
   * This creates the auth session and sets cookies.
   */
  const { data: { user }, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  
  if (exchangeError || !user) {
    console.error('Code exchange error:', exchangeError);
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(exchangeError?.message || 'Failed to sign in')}`
    );
  }
  
  /**
   * SECURITY CHECK: Verify UCI email server-side.
   * 
   * This is our CRITICAL security gate. Even if someone bypasses
   * client-side validation, this will catch them.
   * 
   * In a production app, you might also:
   * - Set up a Supabase Auth Hook to block non-UCI signups entirely
   * - Use Supabase's email domain restriction feature
   */
  if (!user.email || !isValidUCIEmail(user.email)) {
    console.error('Non-UCI email attempted login:', user.email);
    
    // Sign out the non-UCI user immediately
    await supabase.auth.signOut();
    
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent('Only @uci.edu email addresses are allowed')}`
    );
  }
  
  /**
   * Create or update the user's profile.
   * 
   * We use upsert to handle both new users and existing users.
   * ON CONFLICT: If the profile already exists, we don't overwrite it.
   * 
   * NOTE: accepted_rules defaults to false, so new users will be
   * redirected to /rules to accept the community guidelines.
   */
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert(
      {
        id: user.id,
        email: user.email.toLowerCase(),
        // New users start with accepted_rules = false
        // Don't overwrite if profile exists (user may have already accepted)
      },
      {
        onConflict: 'id',
        ignoreDuplicates: true, // Don't update existing profiles
      }
    );
  
  if (profileError) {
    console.error('Profile upsert error:', profileError);
    // Non-fatal: user can still use the app, just might have issues
  }
  
  /**
   * Check if user needs to accept rules.
   * If so, redirect to /rules instead of home.
   */
  const { data: profile } = await supabase
    .from('profiles')
    .select('accepted_rules')
    .eq('id', user.id)
    .single();
  
  if (profile && !profile.accepted_rules) {
    return NextResponse.redirect(`${origin}/rules`);
  }
  
  // Everything good - redirect to home
  return NextResponse.redirect(`${origin}/`);
}

