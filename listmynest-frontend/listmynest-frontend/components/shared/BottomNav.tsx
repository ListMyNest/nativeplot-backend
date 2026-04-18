"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: "🏠" },
  { href: "/listings", label: "Search", icon: "🔍" },
  { href: "/saved", label: "Saved", icon: "❤️" },
  { href: "/account", label: "Hub", icon: "👤" },
] as const;

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomNav() {
  const pathname = usePathname() ?? "/";

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] pt-2 shadow-[0_-2px_12px_rgba(0,0,0,0.06)] md:hidden"
      aria-label="Primary"
    >
      <div className="mx-auto flex max-w-7xl justify-around px-2">
        {NAV_ITEMS.map(({ href, label, icon }) => {
          const active = isActivePath(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className="flex min-h-[48px] min-w-[48px] flex-col items-center justify-center gap-0.5 rounded-lg px-2 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lmn-primary focus-visible:ring-offset-2"
            >
              <span className="relative flex h-7 items-end justify-center text-lg leading-none">
                <span aria-hidden>{icon}</span>
                {active ? (
                  <span
                    className="absolute -bottom-0.5 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-lmn-primary"
                    aria-hidden
                  />
                ) : null}
              </span>
              <span
                className={
                  active
                    ? "text-[11px] font-semibold text-lmn-primary"
                    : "text-[11px] font-medium text-lmn-muted"
                }
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
