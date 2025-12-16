/**
 * =============================================================================
 * Root Layout
 * =============================================================================
 * 
 * The root layout wraps every page in the app.
 * It provides:
 * - Global styles (Tailwind + custom CSS)
 * - Font loading (Geist font family)
 * - Meta tags for SEO and mobile
 * - Auth state checking (redirect to /rules if needed)
 */

import type { Metadata, Viewport } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';

/**
 * App metadata for SEO and social sharing.
 */
export const metadata: Metadata = {
  title: {
    default: 'Sidequest - UCI Task Marketplace',
    template: '%s | Sidequest',
  },
  description: 'A peer-to-peer task marketplace exclusively for UCI students and staff. Post tasks, earn money, help your community.',
  keywords: ['UCI', 'task marketplace', 'gig economy', 'student jobs', 'peer to peer'],
  authors: [{ name: 'Sidequest' }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'Sidequest',
    title: 'Sidequest - UCI Task Marketplace',
    description: 'A peer-to-peer task marketplace exclusively for UCI students and staff.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sidequest - UCI Task Marketplace',
    description: 'A peer-to-peer task marketplace exclusively for UCI students and staff.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

/**
 * Viewport configuration for mobile-first design.
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Prevents zoom on input focus (mobile)
  themeColor: '#0064a4', // UCI Blue - shows in mobile browser chrome
};

/**
 * Root layout component.
 * 
 * NOTE: We don't check auth here because:
 * 1. Middleware handles redirects to /login
 * 2. Individual pages check for accepted_rules
 * 
 * This keeps the layout simple and fast.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="font-sans">
        {children}
      </body>
    </html>
  );
}

