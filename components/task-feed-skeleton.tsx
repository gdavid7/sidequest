/**
 * =============================================================================
 * Task Feed Skeleton
 * =============================================================================
 * 
 * Loading placeholder for the task feed.
 * Shows animated skeletons while data is loading.
 */

export default function TaskFeedSkeleton() {
  return (
    <div className="space-y-4">
      {/* Sort tabs skeleton */}
      <div className="flex gap-2">
        <div className="w-24 h-10 skeleton rounded-full" />
        <div className="w-28 h-10 skeleton rounded-full" />
        <div className="w-20 h-10 skeleton rounded-full ml-auto" />
      </div>
      
      {/* Task card skeletons */}
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-20 h-5 skeleton rounded-full" />
            <div className="w-16 h-4 skeleton rounded-full ml-auto" />
          </div>
          <div className="w-3/4 h-5 skeleton rounded" />
          <div className="w-1/2 h-4 skeleton rounded" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-16 h-6 skeleton rounded" />
              <div className="w-20 h-5 skeleton rounded-full" />
            </div>
            <div className="w-20 h-9 skeleton rounded-xl" />
          </div>
          <div className="pt-3 border-t border-neutral-100">
            <div className="w-32 h-3 skeleton rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

