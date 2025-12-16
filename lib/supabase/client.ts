/**
 * =============================================================================
 * Supabase Browser Client
 * =============================================================================
 * 
 * This client is used in Client Components (browser).
 * It handles cookie-based auth automatically via @supabase/ssr.
 * 
 * SECURITY NOTES:
 * - This client uses the ANON key (safe to expose)
 * - All data access is protected by Row Level Security (RLS)
 * - Never import the service role key into client code!
 * 
 * Usage:
 *   import { createClient } from '@/lib/supabase/client'
 *   const supabase = createClient()
 */

import { createBrowserClient } from '@supabase/ssr';

/**
 * Creates a Supabase client for browser/client components.
 * 
 * This function can be called multiple times - it will return
 * a singleton instance for the current browser session.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

