export function PropertyCardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="group overflow-hidden rounded-2xl border-2 border-border bg-surface shadow-md transition-[transform,box-shadow] duration-base hover:-translate-y-0.5 hover:shadow-lg"
        >
          <div className="relative aspect-video bg-surface2">
            <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-surface2 via-white/40 to-surface2" />
          </div>
          <div className="space-y-2 p-4">
            <div className="h-4 w-[75%] animate-pulse rounded bg-surface2" />
            <div className="h-4 w-[50%] animate-pulse rounded bg-surface2" />
          </div>
        </div>
      ))}
    </div>
  );
}
