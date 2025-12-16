/**
 * =============================================================================
 * Supabase Middleware Client
 * =============================================================================
 * 
 * Special client for Next.js middleware.
 * Handles session refresh on every request.
 * 
 * WHY MIDDLEWARE?
 * - Sessions expire and need refreshing
 * - Middleware runs on every request (perfect for refresh)
 * - Also handles auth redirects (login -> protected routes)
 */

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Updates the Supabase session and returns modified response.
 * 
 * This function:
 * 1. Reads the current session from cookies
 * 2. Refreshes the session if needed (extends expiry)
 * 3. Writes updated cookies to the response
 * 
 * Call this in middleware.ts for every request.
 */
export async function updateSession(request: NextRequest) {
  // Start with a basic response
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Update request cookies (for downstream handlers)
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          
          // Create new response with updated cookies
          supabaseResponse = NextResponse.next({
            request,
          });
          
          // Update response cookies (for the browser)
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Don't add logic between createServerClient and getUser()
  // This allows session refresh to work correctly
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ==========================================================================
  // AUTH ROUTING LOGIC
  // ==========================================================================
  
  const pathname = request.nextUrl.pathname;
  
  // Public routes that don't require auth
  const publicRoutes = ['/login', '/auth/callback', '/auth/confirm'];
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
  
  // If not logged in and trying to access protected route -> redirect to login
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }
  
  // If logged in and on login page -> redirect to home
  if (user && pathname === '/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }
  
  // If logged in, check if they need to accept rules
  // (We do this in the layout instead of middleware for better UX)
  
  return supabaseResponse;
}

