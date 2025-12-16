/**
 * =============================================================================
 * Bottom Navigation
 * =============================================================================
 * 
 * Mobile-first bottom navigation bar.
 * Fixed at the bottom with safe area inset padding.
 * 
 * DESIGN CHOICES:
 * - Icons + labels for clarity
 * - 4 main destinations: Home, Post, Messages, Profile
 * - Active state with brand color
 * - Glass effect for modern look
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

/**
 * Navigation items with icons (using SVG for crispness)
 */
const navItems = [
  {
    href: '/',
    label: 'Home',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    href: '/post',
    label: 'Post',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
      </svg>
    ),
    // Special styling for the "post" action button
    isAction: true,
  },
  {
    href: '/my-tasks',
    label: 'My Tasks',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  {
    href: '/profile',
    label: 'Profile',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
];

export default function BottomNav() {
  const pathname = usePathname();
  
  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-neutral-200"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 8px)' }}
    >
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {navItems.map((item) => {
          // Check if this is the active route
          const isActive = item.href === '/' 
            ? pathname === '/'
            : pathname.startsWith(item.href);
          
          // Special styling for the post button
          if (item.isAction) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center',
                  '-mt-4' // Lift the button up
                )}
              >
                <div className="w-14 h-14 rounded-full bg-brand-gold-500 flex items-center justify-center shadow-lg hover:bg-brand-gold-400 active:scale-95 transition-all">
                  <span className="text-brand-blue-900">{item.icon}</span>
                </div>
                <span className="text-xs mt-0.5 text-neutral-600">{item.label}</span>
              </Link>
            );
          }
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'nav-item',
                isActive && 'nav-item-active'
              )}
            >
              <span className={cn(
                'transition-colors',
                isActive ? 'text-brand-blue-600' : 'text-neutral-400'
              )}>
                {item.icon}
              </span>
              <span className={cn(
                'text-xs mt-0.5 transition-colors',
                isActive ? 'text-brand-blue-600 font-medium' : 'text-neutral-500'
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

