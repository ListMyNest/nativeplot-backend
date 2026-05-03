"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, Home, Search, UserRound } from "lucide-react";

import { Icon } from "../ui/Icon";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/listings", label: "Search", icon: Search },
  { href: "/saved", label: "Saved", icon: Heart },
  { href: "/account", label: "Hub", icon: UserRound },
] as const;

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomNav() {
  const pathname = usePathname() ?? "/";

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-surface/90 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] pt-2 shadow-sm backdrop-blur md:hidden"
      aria-label="Primary"
    >
      <div className="mx-auto flex max-w-7xl justify-around px-2">
        {NAV_ITEMS.map(({ href, label, icon }) => {
          const active = isActivePath(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className="flex min-h-[48px] min-w-[48px] flex-col items-center justify-center gap-0.5 rounded-lg px-2 py-1 text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
            >
              <span className="relative flex h-7 items-center justify-center leading-none">
                <Icon
                  icon={icon}
                  size={24}
                  className={active ? "text-lmn-primary" : "text-muted"}
                  aria-hidden
                />
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
                    : "text-[11px] font-medium text-muted"
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
