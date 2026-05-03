"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Bell, ChevronDown, Menu, X } from "lucide-react";

import { Icon } from "../ui/Icon";

const MAIN_LINKS = [
  { href: "/", label: "Home" },
  { href: "/listings", label: "Buy" },
  { href: "/seller/login", label: "Sell" },
] as const;

const HUB_LINKS = [
  { href: "/seller/login", label: "Seller sign-in" },
  { href: "/saved", label: "Saved listings" },
  { href: "/account", label: "Account home" },
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

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface/85 shadow-sm backdrop-blur">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[200] focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-text focus:shadow-md"
      >
        Skip to content
      </a>
      <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-3 px-4 py-3 sm:px-6 md:px-8 lg:px-10">
        <Link
          href="/"
          className="flex min-h-[48px] min-w-0 items-center gap-2.5 rounded-lg outline-none ring-offset-2 ring-offset-white focus-visible:ring-2 focus-visible:ring-lmn-primary"
        >
          <span
            className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-lmn-primary text-xl leading-none text-white shadow-sm"
            aria-hidden
          >
            🏠
          </span>
          <span className="truncate text-lg font-extrabold tracking-tight text-text">
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
                  : "text-sm font-medium text-muted hover:text-text"
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
              className="flex min-h-[48px] items-center gap-2 rounded-xl border border-border bg-surface px-4 text-sm font-semibold text-text shadow-sm hover:bg-surface2"
              aria-expanded={hubOpen}
              aria-haspopup="true"
              aria-label="Account menu"
            >
              Account
              <Icon icon={ChevronDown} size={16} className="text-muted" aria-hidden />
            </button>
            {hubOpen ? (
              <div
                className="absolute right-0 z-[100] mt-2 w-64 overflow-hidden rounded-2xl border-2 border-border bg-surface shadow-lg"
                role="menu"
              >
                <p className="border-b border-border px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted">
                  Account
                </p>
                {HUB_LINKS.map(({ href, label }) => (
                  <Link
                    key={href + label}
                    href={href}
                    role="menuitem"
                    className="block min-h-[44px] px-3 py-2.5 text-sm font-medium text-text hover:bg-surface2"
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
            className="flex min-h-[48px] min-w-[48px] items-center justify-center rounded-xl border border-border bg-surface text-text shadow-sm hover:bg-surface2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
            aria-label="Notifications"
          >
            <Icon icon={Bell} size={20} aria-hidden />
          </button>
          <button
            type="button"
            className="flex min-h-[48px] min-w-[48px] items-center justify-center rounded-xl border border-border bg-surface text-text shadow-sm hover:bg-surface2 md:hidden"
            aria-expanded={menuOpen}
            aria-label="Open menu"
            onClick={() => setMenuOpen((o) => !o)}
          >
            <Icon icon={menuOpen ? X : Menu} size={24} aria-hidden />
          </button>
        </div>
      </div>

      {menuOpen ? (
        <div className="border-t border-border bg-surface px-4 py-3 md:hidden">
          <nav className="flex flex-col gap-1" aria-label="Mobile">
            {MAIN_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                className="min-h-[48px] rounded-xl px-3 py-3 text-sm font-semibold text-text hover:bg-surface2"
              >
                {label}
              </Link>
            ))}
            <p className="mt-2 px-3 text-[10px] font-bold uppercase tracking-wide text-muted">
              Account
            </p>
            {HUB_LINKS.map(({ href, label }) => (
              <Link
                key={`m-${href}-${label}`}
                href={href}
                onClick={() => setMenuOpen(false)}
                className="min-h-[48px] rounded-xl px-3 py-3 text-sm font-medium text-text hover:bg-surface2"
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
