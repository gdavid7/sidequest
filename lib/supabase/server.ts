/**
 * =============================================================================
 * Supabase Server Client
 * =============================================================================
 * 
 * This client is used in Server Components, Server Actions, and Route Handlers.
 * It handles cookie-based auth via Next.js cookies() API.
 * 
 * SECURITY NOTES:
 * - This client uses the ANON key by default (RLS still applies)
 * - For admin operations, use createServiceClient() with the SERVICE_ROLE key
 * - Never expose the service role key to the client!
 * 
 * WHY COOKIES?
 * - Supabase stores the auth session in cookies
 * - We need to read cookies server-side to verify auth
 * - The @supabase/ssr package handles this seamlessly
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Creates a Supabase client for server-side code.
 * 
 * IMPORTANT: This function is async because cookies() is async in Next.js 15+
 * For compatibility, we use a sync version that works with Next.js 14.
 * 
 * Call this in:
 * - Server Components
 * - Server Actions
 * - Route Handlers
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        /**
         * Get all cookies from the request.
         * Used by Supabase to read the auth session.
         */
        getAll() {
          return cookieStore.getAll();
        },
        /**
         * Set cookies in the response.
         * Used by Supabase to refresh the auth session.
         * 
         * Note: This may fail in Server Components (they're read-only).
         * That's okay - the middleware will handle session refresh.
         */
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method is called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
      },
    }
  );
}

/**
 * Gets the current authenticated user from a server context.
 * 
 * Returns null if not authenticated.
 * 
 * SECURITY NOTE: Always verify the user server-side before any operation.
 * Never trust client-provided user IDs!
 */
export async function getUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return null;
  }
  
  return user;
}

/**
 * Gets the current user's profile from the database.
 * 
 * Returns null if not authenticated or profile doesn't exist.
 */
export async function getProfile() {
  const supabase = await createClient();
  const user = await getUser();
  
  if (!user) {
    return null;
  }
  
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  
  if (error || !profile) {
    return null;
  }
  
  return profile;
}

