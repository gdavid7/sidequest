/**
 * =============================================================================
 * Login Page
 * =============================================================================
 * 
 * Magic link login page for UCI students/staff.
 * 
 * SECURITY: UCI-Only Authentication
 * ================================
 * We ONLY allow @uci.edu emails. Here's why:
 * 
 * 1. WHY NOT GENERIC .edu?
 *    - Any university email could sign up
 *    - No way to verify they're actually UCI
 *    - Defeats the purpose of a local, trusted community
 * 
 * 2. WHY @uci.edu SPECIFICALLY?
 *    - Verified UCI affiliation (student/staff/faculty)
 *    - Creates accountability (real identity tied to university)
 *    - If issues arise, users can be identified via UCI admin
 *    - Builds trust: you know who you're dealing with
 * 
 * 3. ENFORCEMENT:
 *    - Client-side: Prevents accidental non-UCI signups (UX)
 *    - Server-side: Supabase auth hook validates domain (SECURITY)
 *    - Both are needed! Client-only is bypassable.
 */

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { isValidUCIEmail } from '@/lib/utils';

/**
 * Wrapper component to handle Suspense boundary for useSearchParams.
 */
export default function LoginPage() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <LoginForm />
    </Suspense>
  );
}

/**
 * Loading skeleton while search params load.
 */
function LoginSkeleton() {
  return (
    <div className="w-full max-w-md animate-pulse">
      <div className="text-center mb-8">
        <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-neutral-200" />
        <div className="h-8 bg-neutral-200 rounded w-32 mx-auto mb-2" />
        <div className="h-4 bg-neutral-200 rounded w-48 mx-auto" />
      </div>
      <div className="card p-6">
        <div className="h-12 bg-neutral-200 rounded mb-4" />
        <div className="h-12 bg-neutral-200 rounded" />
      </div>
    </div>
  );
}

/**
 * The actual login form component.
 */
function LoginForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const searchParams = useSearchParams();
  
  const supabase = createClient();
  
  /**
   * Check for error messages in URL (from failed auth callback).
   * This handles cases like expired magic links.
   */
  useEffect(() => {
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    const errorCode = searchParams.get('error_code');
    
    if (error || errorDescription) {
      // Provide user-friendly error messages
      let friendlyMessage = errorDescription || error || 'Login failed';
      
      // Make common errors more understandable
      if (errorCode === 'otp_expired' || friendlyMessage.includes('expired')) {
        friendlyMessage = 'Your magic link has expired or was already used. This can happen if:\n\n• You clicked the link on a different device/browser\n• Your email app previewed the link\n• You waited too long to click\n\nPlease request a new link below.';
      }
      
      setMessage({ type: 'error', text: friendlyMessage });
    }
  }, [searchParams]);
  
  /**
   * Handle magic link login.
   * 
   * Flow:
   * 1. User enters UCI email
   * 2. We validate it's @uci.edu (client-side)
   * 3. Supabase sends magic link email
   * 4. User clicks link -> /auth/callback
   * 5. Callback creates session -> redirect to home
   */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    
    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();
    
    // Client-side validation (UX only - server validates too)
    if (!normalizedEmail) {
      setMessage({ type: 'error', text: 'Please enter your UCI email' });
      return;
    }
    
    if (!isValidUCIEmail(normalizedEmail)) {
      setMessage({ 
        type: 'error', 
        text: 'Please use your @uci.edu email address' 
      });
      return;
    }
    
    setLoading(true);
    
    try {
      /**
       * Send magic link via Supabase Auth.
       * 
       * The emailRedirectTo tells Supabase where to redirect after
       * the user clicks the magic link in their email.
       * 
       * IMPORTANT: This URL must be in your Supabase project's
       * "Redirect URLs" whitelist (Dashboard -> Auth -> URL Configuration)
       */
      const { error } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: {
          // Where to redirect after clicking the magic link
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      
      if (error) {
        console.error('Login error:', error);
        setMessage({ 
          type: 'error', 
          text: error.message || 'Failed to send magic link' 
        });
      } else {
        setMessage({ 
          type: 'success', 
          text: 'Check your UCI email for the magic link! 📧' 
        });
        setEmail('');
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      setMessage({ 
        type: 'error', 
        text: 'Something went wrong. Please try again.' 
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="w-full max-w-md animate-fade-in">
      {/* Logo and header */}
      <div className="text-center mb-8">
        {/* Anteater logo placeholder - use UCI colors */}
        <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-brand-blue-500 to-brand-blue-600 flex items-center justify-center shadow-lg">
          <span className="text-4xl">🐜</span>
        </div>
        <h1 className="text-3xl font-bold text-brand-blue-600 mb-2">
          Sidequest
        </h1>
        <p className="text-neutral-600">
          UCI&apos;s peer-to-peer task marketplace
        </p>
      </div>
      
      {/* Login card */}
      <div className="card p-6">
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label 
              htmlFor="email" 
              className="block text-sm font-medium text-neutral-700 mb-1"
            >
              UCI Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="yournetid@uci.edu"
              className="input"
              disabled={loading}
              autoComplete="email"
              autoFocus
            />
            <p className="mt-1 text-xs text-neutral-500">
              We&apos;ll send you a magic link to sign in
            </p>
          </div>
          
          {/* Status message */}
          {message && (
            <div 
              className={`p-3 rounded-xl text-sm animate-slide-down whitespace-pre-line ${
                message.type === 'success' 
                  ? 'bg-green-50 text-green-800 border border-green-200' 
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {message.text}
            </div>
          )}
          
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle 
                    className="opacity-25" 
                    cx="12" cy="12" r="10" 
                    stroke="currentColor" 
                    strokeWidth="4"
                    fill="none"
                  />
                  <path 
                    className="opacity-75" 
                    fill="currentColor" 
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Sending magic link...
              </span>
            ) : (
              'Continue with UCI Email'
            )}
          </button>
        </form>
      </div>
      
      {/* Info box */}
      <div className="mt-6 p-4 bg-brand-blue-50 rounded-xl border border-brand-blue-100">
        <h3 className="font-medium text-brand-blue-800 mb-2 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Why UCI email only?
        </h3>
        <p className="text-sm text-brand-blue-700">
          Sidequest is exclusively for the UCI community. Using your @uci.edu email 
          helps us maintain a safe, trusted marketplace where everyone knows they&apos;re 
          dealing with fellow Anteaters.
        </p>
      </div>
    </div>
  );
}

