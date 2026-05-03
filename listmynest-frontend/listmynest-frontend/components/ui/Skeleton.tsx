export function Skeleton({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      className={[
        "relative overflow-hidden rounded-xl bg-surface2",
        "before:absolute before:inset-0",
        "before:animate-[shimmer_1.2s_infinite]",
        "before:bg-gradient-to-r before:from-surface2 before:via-white/45 before:to-surface2",
        className,
      ].join(" ")}
      aria-hidden
    />
  );
}

