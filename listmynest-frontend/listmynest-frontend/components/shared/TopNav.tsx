"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const MAIN_LINKS = [
  { href: "/", label: "Home" },
  { href: "/listings", label: "Buy" },
  { href: "/seller/login", label: "Sell" },
] as const;

const HUB_LINKS = [
  { href: "/seller/login", label: "Seller sign-in" },
  { href: "/saved", label: "Saved listings" },
  { href: "/account", label: "Hub home" },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function TopNav() {
  const pathname = usePathname() ?? "/";
  const [menuOpen, setMenuOpen] = useState(false);
  const [hubOpen, setHubOpen] = useState(false);
  const hubRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hubOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!hubRef.current?.contains(e.target as Node)) setHubOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [hubOpen]);

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white shadow-sm">
      <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-3 px-4 py-3 sm:px-6 md:px-8 lg:px-10">
        <Link
          href="/"
          className="flex min-h-[48px] min-w-0 items-center gap-2.5 rounded-lg outline-none ring-offset-2 ring-offset-white focus-visible:ring-2 focus-visible:ring-lmn-primary"
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

        <nav
          className="hidden items-center gap-6 lg:flex"
          aria-label="Main"
        >
          {MAIN_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={
                isActive(pathname, href)
                  ? "text-sm font-semibold text-lmn-primary"
                  : "text-sm font-medium text-lmn-muted hover:text-lmn-dark"
              }
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <div className="relative hidden md:block" ref={hubRef}>
            <button
              type="button"
              onClick={() => setHubOpen((o) => !o)}
              className="flex min-h-[48px] items-center gap-1 rounded-xl border border-lmn-border px-4 text-sm font-semibold text-lmn-dark hover:bg-lmn-card"
              aria-expanded={hubOpen}
              aria-haspopup="true"
              aria-label="Hub: sign-in for agents, sellers, and admin"
            >
              Hub
              <span className="text-xs text-lmn-muted" aria-hidden>
                ▾
              </span>
            </button>
            {hubOpen ? (
              <div
                className="absolute right-0 z-[100] mt-1 w-56 rounded-xl border border-lmn-border bg-white py-1 shadow-lg"
                role="menu"
              >
                <p className="border-b border-lmn-border px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-lmn-muted">
                  Seller tools
                </p>
                {HUB_LINKS.map(({ href, label }) => (
                  <Link
                    key={href + label}
                    href={href}
                    role="menuitem"
                    className="block min-h-[44px] px-3 py-2.5 text-sm font-medium text-lmn-dark hover:bg-lmn-card"
                    onClick={() => setHubOpen(false)}
                  >
                    {label}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>

          <button
            type="button"
            className="flex min-h-[48px] min-w-[48px] items-center justify-center rounded-xl bg-lmn-card text-xl leading-none text-lmn-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lmn-primary focus-visible:ring-offset-2"
            aria-label="Notifications"
          >
            🔔
          </button>
          <button
            type="button"
            className="flex min-h-[48px] min-w-[48px] items-center justify-center rounded-xl border border-lmn-border text-lg md:hidden"
            aria-expanded={menuOpen}
            aria-label="Open menu"
            onClick={() => setMenuOpen((o) => !o)}
          >
            ☰
          </button>
        </div>
      </div>

      {menuOpen ? (
        <div className="border-t border-gray-200 bg-white px-4 py-3 md:hidden">
          <nav className="flex flex-col gap-1" aria-label="Mobile">
            {MAIN_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                className="min-h-[48px] rounded-lg px-3 py-3 text-sm font-semibold text-lmn-dark hover:bg-lmn-card"
              >
                {label}
              </Link>
            ))}
            <p className="mt-2 px-3 text-[10px] font-bold uppercase tracking-wide text-lmn-muted">
              Hub
            </p>
            {HUB_LINKS.map(({ href, label }) => (
              <Link
                key={`m-${href}-${label}`}
                href={href}
                onClick={() => setMenuOpen(false)}
                className="min-h-[48px] rounded-lg px-3 py-3 text-sm font-medium text-lmn-dark hover:bg-lmn-card"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
