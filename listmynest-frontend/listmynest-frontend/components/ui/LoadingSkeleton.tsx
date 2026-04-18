export function PropertyCardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-2xl border border-lmn-border bg-white shadow-sm"
        >
          <div className="aspect-video animate-pulse bg-gray-200" />
          <div className="space-y-2 p-4">
            <div className="h-4 w-[75%] animate-pulse rounded bg-gray-200" />
            <div className="h-4 w-[50%] animate-pulse rounded bg-gray-200" />
          </div>
        </div>
      ))}
    </div>
  );
}
