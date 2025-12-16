/**
 * =============================================================================
 * Rules Acceptance Page
 * =============================================================================
 * 
 * New users must accept community guidelines before using the app.
 * 
 * WHY RULES?
 * - Sets expectations for behavior
 * - Provides legal protection ("you agreed to these terms")
 * - Creates a moment of reflection before using the platform
 * 
 * EXTENSION POINT: Full Terms of Service
 * In production, you'd want proper ToS reviewed by a lawyer.
 * This MVP version is simplified community guidelines.
 */

import { redirect } from 'next/navigation';
import { createClient, getUser } from '@/lib/supabase/server';
import RulesForm from './rules-form';

/**
 * Server component that checks auth and loads profile.
 */
export default async function RulesPage() {
  const user = await getUser();
  
  // If not logged in, redirect to login
  if (!user) {
    redirect('/login');
  }
  
  const supabase = await createClient();
  
  // Check if user has already accepted rules
  const { data: profile } = await supabase
    .from('profiles')
    .select('accepted_rules')
    .eq('id', user.id)
    .single();
  
  // If already accepted, redirect to home
  if (profile?.accepted_rules) {
    redirect('/');
  }
  
  return (
    <div className="w-full max-w-lg animate-fade-in">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-brand-gold-500 flex items-center justify-center">
          <span className="text-3xl">📜</span>
        </div>
        <h1 className="text-2xl font-bold text-neutral-900 mb-2">
          Community Guidelines
        </h1>
        <p className="text-neutral-600">
          Please review and accept before continuing
        </p>
      </div>
      
      {/* Rules card */}
      <div className="card p-6">
        <div className="space-y-4 text-sm text-neutral-700 mb-6">
          <div className="flex gap-3">
            <span className="text-xl">🤝</span>
            <div>
              <h3 className="font-semibold text-neutral-900">Be Respectful</h3>
              <p>Treat everyone with kindness and respect. We&apos;re all Anteaters here.</p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <span className="text-xl">✅</span>
            <div>
              <h3 className="font-semibold text-neutral-900">Honor Your Commitments</h3>
              <p>If you accept a task, complete it. If you post a task, pay promptly when done.</p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <span className="text-xl">💬</span>
            <div>
              <h3 className="font-semibold text-neutral-900">Communicate Clearly</h3>
              <p>Use the chat to coordinate details. Let the other person know if plans change.</p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <span className="text-xl">🚫</span>
            <div>
              <h3 className="font-semibold text-neutral-900">No Prohibited Content</h3>
              <p>No illegal activities, academic dishonesty, or harassment. Use common sense.</p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <span className="text-xl">⚠️</span>
            <div>
              <h3 className="font-semibold text-neutral-900">Safety First</h3>
              <p>Meet in public places when possible. Trust your instincts. You can block users if needed.</p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <span className="text-xl">💸</span>
            <div>
              <h3 className="font-semibold text-neutral-900">Payment is Between Users</h3>
              <p>Sidequest doesn&apos;t handle payments. Coordinate payment method via chat (Venmo, Zelle, cash, etc.).</p>
            </div>
          </div>
        </div>
        
        {/* Disclaimer */}
        <div className="p-3 bg-neutral-50 rounded-lg text-xs text-neutral-600 mb-6">
          <strong>Note:</strong> Sidequest is a platform connecting UCI community members. 
          We don&apos;t verify task completion or handle disputes. Use good judgment 
          and only accept tasks you&apos;re comfortable with.
        </div>
        
        {/* Accept form */}
        <RulesForm userId={user.id} />
      </div>
    </div>
  );
}

