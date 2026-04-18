import Link from "next/link";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-lmn-border bg-white">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-3 px-4 sm:h-[3.75rem]">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2.5 rounded-lg outline-none ring-offset-2 ring-offset-white focus-visible:ring-2 focus-visible:ring-lmn-primary"
        >
          <span
            className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-lmn-primary text-xl leading-none text-white"
            aria-hidden
          >
            🏠
          </span>
          <span className="truncate text-lg font-extrabold tracking-tight text-lmn-dark">
            List<span className="text-lmn-primary">MyNest</span>
          </span>
        </Link>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            className="flex size-12 min-h-[48px] min-w-[48px] items-center justify-center rounded-xl bg-lmn-card text-xl leading-none text-lmn-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lmn-primary focus-visible:ring-offset-2"
            aria-label="Notifications"
          >
            🔔
          </button>
        </div>
      </div>
    </header>
  );
}
