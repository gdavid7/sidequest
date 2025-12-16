/**
 * =============================================================================
 * Rules Acceptance Form (Client Component)
 * =============================================================================
 * 
 * Handles the checkbox and submit for accepting community guidelines.
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { acceptRules } from '@/lib/actions/auth';

interface RulesFormProps {
  userId: string;
}

export default function RulesForm({ userId }: RulesFormProps) {
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!accepted) {
      setError('Please check the box to accept the guidelines');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await acceptRules(userId);
      
      if (result.success) {
        // Redirect to home page
        router.push('/');
        router.refresh(); // Refresh server components
      } else {
        setError(result.error || 'Failed to save. Please try again.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {/* Checkbox */}
      <label className="flex items-start gap-3 cursor-pointer group">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          className="mt-1 w-5 h-5 rounded border-neutral-300 text-brand-blue-600 
                     focus:ring-brand-blue-500 cursor-pointer"
        />
        <span className="text-sm text-neutral-700 group-hover:text-neutral-900">
          I have read and agree to follow the Sidequest community guidelines. 
          I understand that violating these guidelines may result in my account being blocked.
        </span>
      </label>
      
      {/* Error message */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 text-red-800 text-sm rounded-lg">
          {error}
        </div>
      )}
      
      {/* Submit button */}
      <button
        type="submit"
        disabled={loading || !accepted}
        className="btn-gold w-full mt-6"
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
            Saving...
          </span>
        ) : (
          'Accept & Continue'
        )}
      </button>
    </form>
  );
}

