/**
 * =============================================================================
 * Next.js Middleware
 * =============================================================================
 * 
 * This middleware runs on EVERY request before it hits the page.
 * 
 * It handles:
 * 1. Session refresh (keeps user logged in)
 * 2. Auth redirects (login page <-> protected routes)
 * 
 * PERFORMANCE NOTE:
 * Middleware runs on the edge, so keep it lightweight.
 * Heavy operations (like DB queries) should happen in layouts/pages.
 */

import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

/**
 * Configure which routes the middleware runs on.
 * 
 * We exclude:
 * - _next/static (static files)
 * - _next/image (image optimization)
 * - favicon.ico (browser icon)
 * 
 * Everything else goes through the middleware.
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

