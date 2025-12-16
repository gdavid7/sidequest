/**
 * =============================================================================
 * Profile Page
 * =============================================================================
 * 
 * User profile showing stats, ratings, and settings.
 */

import { redirect } from 'next/navigation';
import { getUser, createClient } from '@/lib/supabase/server';
import { getUserRatings } from '@/lib/actions/ratings';
import ProfileClient from './profile-client';

export default async function ProfilePage() {
  const user = await getUser();
  
  if (!user) {
    redirect('/login');
  }
  
  const supabase = await createClient();
  
  // Get profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  
  if (!profile) {
    redirect('/login');
  }
  
  // Get ratings
  const ratingsResult = await getUserRatings(user.id);
  const ratingsData = ratingsResult.success ? ratingsResult.data : null;
  
  // Get task counts
  const { count: postedCount } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('poster_id', user.id);
  
  const { count: completedAsWorkerCount } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('accepted_by_user_id', user.id)
    .eq('status', 'COMPLETE');
  
  return (
    <ProfileClient
      profile={profile}
      ratings={{
        average: ratingsData?.average || null,
        count: ratingsData?.count || 0,
        recent: ratingsData?.ratings.slice(0, 5) || [],
      }}
      stats={{
        tasksPosted: postedCount || 0,
        tasksCompleted: completedAsWorkerCount || 0,
      }}
    />
  );
}

