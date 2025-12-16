/**
 * =============================================================================
 * Global Loading State
 * =============================================================================
 * 
 * Shown during route transitions and initial page loads.
 */

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="w-16 h-16 rounded-full bg-brand-gold-500 flex items-center justify-center animate-pulse-soft mb-4">
        <span className="text-3xl">🐜</span>
      </div>
      <div className="text-neutral-500">Loading...</div>
    </div>
  );
}

