/**
 * =============================================================================
 * Main App Layout
 * =============================================================================
 * 
 * Layout for authenticated pages with bottom navigation.
 * This wraps all pages except auth pages (login, rules).
 * 
 * MOBILE-FIRST DESIGN:
 * - Bottom navigation for easy thumb access
 * - Safe area insets for notched phones
 * - Scrollable content area
 */

import { redirect } from 'next/navigation';
import { getUser, createClient } from '@/lib/supabase/server';
import BottomNav from '@/components/bottom-nav';

/**
 * Server component that checks auth before rendering.
 */
export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  
  // If not logged in, middleware should have caught this
  // but double-check just in case
  if (!user) {
    redirect('/login');
  }
  
  // Check if user has accepted rules
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('accepted_rules')
    .eq('id', user.id)
    .single();
  
  // If profile doesn't exist or rules not accepted, redirect
  if (!profile || !profile.accepted_rules) {
    redirect('/rules');
  }
  
  return (
    <div className="min-h-screen flex flex-col">
      {/* Main content area */}
      <main className="flex-1 page-container">
        {children}
      </main>
      
      {/* Bottom navigation */}
      <BottomNav />
    </div>
  );
}

