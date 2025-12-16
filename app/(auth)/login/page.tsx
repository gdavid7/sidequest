/**
 * =============================================================================
 * Login Page
 * =============================================================================
 * 
 * OTP code login page for UCI students/staff.
 * 
 * WHY OTP CODES INSTEAD OF MAGIC LINKS?
 * =====================================
 * Magic links have issues on iOS/iPad:
 * - Mail app previews links, consuming the one-time token
 * - Opening links in different browser contexts fails
 * - Safari's tracking prevention interferes
 * 
 * OTP codes are more reliable:
 * - User manually types the 6-digit code
 * - No link clicking issues
 * - Works on any device/browser
 * 
 * SECURITY: UCI-Only Authentication
 * ================================
 * We ONLY allow @uci.edu emails. This creates a trusted, local community
 * where users can be identified via their university affiliation.
 */

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
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
 * The actual login form component with two steps:
 * 1. Enter email -> Send OTP code
 * 2. Enter code -> Verify and login
 */
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Form state
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const supabase = createClient();
  
  /**
   * Check for error messages in URL (from failed auth callback).
   */
  useEffect(() => {
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    
    if (error || errorDescription) {
      setMessage({ 
        type: 'error', 
        text: errorDescription || error || 'Login failed. Please try again.' 
      });
    }
  }, [searchParams]);
  
  /**
   * Step 1: Send OTP code to email.
   */
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    
    const normalizedEmail = email.toLowerCase().trim();
    
    if (!normalizedEmail) {
      setMessage({ type: 'error', text: 'Please enter your UCI email' });
      return;
    }
    
    if (!isValidUCIEmail(normalizedEmail)) {
      setMessage({ type: 'error', text: 'Please use your @uci.edu email address' });
      return;
    }
    
    setLoading(true);
    
    try {
      /**
       * Send OTP code via Supabase Auth.
       * This sends a 6-digit code to the user's email.
       */
      const { error } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: {
          // Don't create a magic link, just send the code
          shouldCreateUser: true,
        },
      });
      
      if (error) {
        console.error('Send code error:', error);
        setMessage({ type: 'error', text: error.message || 'Failed to send code' });
      } else {
        setMessage({ 
          type: 'success', 
          text: 'Check your UCI email for the 6-digit code! 📧' 
        });
        setStep('code');
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      setMessage({ type: 'error', text: 'Something went wrong. Please try again.' });
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Step 2: Verify the OTP code.
   */
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    
    const code = otpCode.trim();
    
    if (!code || code.length !== 6) {
      setMessage({ type: 'error', text: 'Please enter the 6-digit code' });
      return;
    }
    
    setLoading(true);
    
    try {
      /**
       * Verify the OTP code with Supabase.
       * If successful, this creates a session and logs the user in.
       */
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.toLowerCase().trim(),
        token: code,
        type: 'email',
      });
      
      if (error) {
        console.error('Verify code error:', error);
        if (error.message.includes('expired')) {
          setMessage({ 
            type: 'error', 
            text: 'Code expired. Please request a new one.' 
          });
          setStep('email');
          setOtpCode('');
        } else {
          setMessage({ type: 'error', text: error.message || 'Invalid code' });
        }
      } else if (data.user) {
        // Success! Create profile if needed and redirect
        setMessage({ type: 'success', text: 'Logging you in...' });
        
        // Create profile if it doesn't exist
        await supabase.from('profiles').upsert(
          {
            id: data.user.id,
            email: data.user.email!.toLowerCase(),
          },
          { onConflict: 'id', ignoreDuplicates: true }
        );
        
        // Check if user needs to accept rules
        const { data: profile } = await supabase
          .from('profiles')
          .select('accepted_rules')
          .eq('id', data.user.id)
          .single();
        
        if (profile && !profile.accepted_rules) {
          router.push('/rules');
        } else {
          router.push('/');
        }
        router.refresh();
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      setMessage({ type: 'error', text: 'Something went wrong. Please try again.' });
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Go back to email step.
   */
  const handleBack = () => {
    setStep('email');
    setOtpCode('');
    setMessage(null);
  };
  
  /**
   * Resend the code.
   */
  const handleResend = async () => {
    setMessage(null);
    setLoading(true);
    
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.toLowerCase().trim(),
        options: { shouldCreateUser: true },
      });
      
      if (error) {
        setMessage({ type: 'error', text: error.message || 'Failed to resend code' });
      } else {
        setMessage({ type: 'success', text: 'New code sent! Check your email.' });
        setOtpCode('');
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to resend code' });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="w-full max-w-md animate-fade-in">
      {/* Logo and header */}
      <div className="text-center mb-8">
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
        {step === 'email' ? (
          /* Step 1: Enter email */
          <form onSubmit={handleSendCode} className="space-y-4">
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
                We&apos;ll send you a 6-digit code to sign in
              </p>
            </div>
            
            {/* Status message */}
            {message && (
              <div 
                className={`p-3 rounded-xl text-sm animate-slide-down ${
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
                  Sending code...
                </span>
              ) : (
                'Send Code'
              )}
            </button>
          </form>
        ) : (
          /* Step 2: Enter OTP code */
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <div>
              <label 
                htmlFor="code" 
                className="block text-sm font-medium text-neutral-700 mb-1"
              >
                Enter the 6-digit code
              </label>
              <input
                id="code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="input text-center text-2xl tracking-widest font-mono"
                disabled={loading}
                autoComplete="one-time-code"
                autoFocus
                maxLength={6}
              />
              <p className="mt-1 text-xs text-neutral-500">
                Sent to {email}
              </p>
            </div>
            
            {/* Status message */}
            {message && (
              <div 
                className={`p-3 rounded-xl text-sm animate-slide-down ${
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
              disabled={loading || otpCode.length !== 6}
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
                  Verifying...
                </span>
              ) : (
                'Verify & Log In'
              )}
            </button>
            
            {/* Secondary actions */}
            <div className="flex gap-4 justify-center text-sm">
              <button
                type="button"
                onClick={handleResend}
                disabled={loading}
                className="text-brand-blue-600 hover:text-brand-blue-700"
              >
                Resend code
              </button>
              <span className="text-neutral-300">|</span>
              <button
                type="button"
                onClick={handleBack}
                disabled={loading}
                className="text-neutral-500 hover:text-neutral-700"
              >
                Use different email
              </button>
            </div>
          </form>
        )}
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
