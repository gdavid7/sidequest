/**
 * =============================================================================
 * Profile Client Component
 * =============================================================================
 * 
 * Interactive profile page with editable display name and sign out.
 */

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateDisplayName, signOut } from '@/lib/actions/auth';
import type { Profile, Rating } from '@/lib/types';
import { getDisplayName, getUCINetID, cn } from '@/lib/utils';

interface ProfileClientProps {
  profile: Profile;
  ratings: {
    average: number | null;
    count: number;
    recent: Rating[];
  };
  stats: {
    tasksPosted: number;
    tasksCompleted: number;
  };
}

export default function ProfileClient({ profile, ratings, stats }: ProfileClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(profile.display_name || '');
  const [error, setError] = useState<string | null>(null);
  
  /**
   * Handle saving display name.
   */
  const handleSave = () => {
    startTransition(async () => {
      const result = await updateDisplayName(displayName);
      
      if (result.success) {
        setIsEditing(false);
        router.refresh();
      } else {
        setError(result.error || 'Failed to save');
      }
    });
  };
  
  /**
   * Handle sign out.
   */
  const handleSignOut = () => {
    startTransition(async () => {
      await signOut();
      router.push('/login');
      router.refresh();
    });
  };
  
  return (
    <div className="px-4 py-4">
      {/* Header */}
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">Profile</h1>
      </header>
      
      {/* Profile card */}
      <div className="card p-6 mb-4">
        {/* Avatar and name */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-brand-blue-500 to-brand-blue-600 flex items-center justify-center text-white text-2xl font-bold">
            {getDisplayName(profile).charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            {isEditing ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Display name"
                  className="input text-lg font-semibold"
                  maxLength={50}
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    disabled={isPending}
                    className="btn-primary text-sm py-1"
                  >
                    {isPending ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setDisplayName(profile.display_name || '');
                    }}
                    className="btn-ghost text-sm py-1"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-bold text-neutral-900">
                  {getDisplayName(profile)}
                </h2>
                <p className="text-sm text-neutral-500">{profile.email}</p>
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-sm text-brand-blue-600 hover:text-brand-blue-700 mt-1"
                >
                  Edit name
                </button>
              </>
            )}
          </div>
        </div>
        
        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-800 text-sm rounded-xl">
            {error}
          </div>
        )}
        
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-3 bg-neutral-50 rounded-xl">
            <p className="text-2xl font-bold text-brand-blue-600">
              {ratings.average !== null ? ratings.average.toFixed(1) : '-'}
            </p>
            <p className="text-xs text-neutral-500">Rating</p>
            <p className="text-xs text-neutral-400">
              {ratings.count} review{ratings.count !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="p-3 bg-neutral-50 rounded-xl">
            <p className="text-2xl font-bold text-brand-blue-600">
              {stats.tasksPosted}
            </p>
            <p className="text-xs text-neutral-500">Posted</p>
          </div>
          <div className="p-3 bg-neutral-50 rounded-xl">
            <p className="text-2xl font-bold text-brand-blue-600">
              {stats.tasksCompleted}
            </p>
            <p className="text-xs text-neutral-500">Completed</p>
          </div>
        </div>
      </div>
      
      {/* Recent ratings */}
      {ratings.recent.length > 0 && (
        <div className="card p-4 mb-4">
          <h3 className="font-semibold text-neutral-900 mb-3">Recent Reviews</h3>
          <div className="space-y-3">
            {ratings.recent.map((rating) => (
              <div key={rating.id} className="border-b border-neutral-100 last:border-0 pb-3 last:pb-0">
                <div className="flex items-center gap-1 mb-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <svg
                      key={star}
                      className={cn(
                        'w-4 h-4',
                        star <= rating.stars ? 'text-brand-gold-500' : 'text-neutral-200'
                      )}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                {rating.comment && (
                  <p className="text-sm text-neutral-600">{rating.comment}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Account section */}
      <div className="card p-4">
        <h3 className="font-semibold text-neutral-900 mb-3">Account</h3>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between py-2">
            <span className="text-neutral-600">UCInetID</span>
            <span className="text-neutral-900 font-medium">
              {getUCINetID(profile.email)}
            </span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-neutral-600">Member since</span>
            <span className="text-neutral-900">
              {new Date(profile.created_at).toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric',
              })}
            </span>
          </div>
        </div>
        
        <button
          onClick={handleSignOut}
          disabled={isPending}
          className="btn-ghost text-red-500 hover:bg-red-50 w-full mt-4"
        >
          {isPending ? 'Signing out...' : 'Sign Out'}
        </button>
      </div>
      
      {/* App info */}
      <div className="mt-6 text-center text-xs text-neutral-400">
        <p>Sidequest v0.1.0</p>
        <p className="mt-1">Made with 💙💛 for UCI</p>
      </div>
    </div>
  );
}

