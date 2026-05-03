"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Menu, X } from "lucide-react";

import { Icon } from "../ui/Icon";

type Variant = "seller" | "agent" | "admin";

const NAV: Record<
  Variant,
  { href: string; label: string; short?: string }[]
> = {
  seller: [
    { href: "/seller/dashboard", label: "Dashboard", short: "Dashboard" },
    { href: "/seller/add-listing", label: "Add listing", short: "Add" },
  ],
  agent: [{ href: "/agent/dashboard", label: "Dashboard", short: "Dashboard" }],
  admin: [{ href: "/admin/dashboard", label: "Dashboard", short: "Dashboard" }],
};

export function AppDashboardChrome({
  variant,
  children,
}: {
  variant: Variant;
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const items = NAV[variant];
  const title =
    variant === "seller"
      ? "Seller"
      : variant === "agent"
        ? "Agent"
        : "Admin";

  const activeItem = useMemo(() => {
    for (const l of items) {
      if (pathname === l.href || pathname.startsWith(`${l.href}/`)) return l;
    }
    return items[0] ?? null;
  }, [items, pathname]);

  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  return (
    <div className="min-h-[100dvh] w-full bg-bg">
      {/* Mobile app bar */}
      <div className="sticky top-0 z-40 border-b border-border bg-surface/85 backdrop-blur lg:hidden">
        <div className="mx-auto flex h-14 max-w-[1280px] items-center justify-between px-4">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="flex size-11 items-center justify-center rounded-xl border border-border bg-surface text-text shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
            aria-label="Open menu"
          >
            <Icon icon={Menu} size={20} aria-hidden />
          </button>
          <div className="min-w-0 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
              {title}
            </p>
            <p className="truncate text-sm font-extrabold text-text">
              {activeItem?.short ?? activeItem?.label ?? "Dashboard"}
            </p>
          </div>
          <div className="size-11" />
        </div>
      </div>

      {/* Layout */}
      <div className="flex w-full lg:mx-auto lg:max-w-[1280px]">
        <aside className="sticky top-0 hidden h-screen shrink-0 border-r border-border bg-surface px-3 py-8 lg:block lg:w-64">
          <p className="mb-4 px-3 text-xs font-bold uppercase tracking-wide text-muted">
            {title}
          </p>
          <nav className="space-y-1">
            {items.map((l) => {
              const active =
                pathname === l.href || pathname.startsWith(`${l.href}/`);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={[
                    "block rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors duration-fast",
                    active
                      ? "bg-lmn-primary/10 text-lmn-primary"
                      : "text-text hover:bg-surface2",
                  ].join(" ")}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Mobile drawer */}
        {drawerOpen ? (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
            <button
              type="button"
              className="absolute inset-0 bg-black/35 backdrop-blur-[2px]"
              onClick={() => setDrawerOpen(false)}
              aria-label="Close menu"
            />
            <div className="absolute left-0 top-0 h-full w-[86%] max-w-xs bg-surface shadow-xl">
              <div className="flex items-center justify-between border-b border-border px-4 py-4">
                <p className="text-sm font-extrabold text-text">{title}</p>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="flex size-10 items-center justify-center rounded-xl border border-border bg-surface text-text shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
                  aria-label="Close menu"
                >
                  <Icon icon={X} size={20} aria-hidden />
                </button>
              </div>
              <nav className="p-2">
                {items.map((l) => {
                  const active =
                    pathname === l.href || pathname.startsWith(`${l.href}/`);
                  return (
                    <Link
                      key={`m-${l.href}`}
                      href={l.href}
                      onClick={() => setDrawerOpen(false)}
                      className={[
                        "block rounded-xl px-3 py-3 text-sm font-semibold",
                        active
                          ? "bg-lmn-primary/10 text-lmn-primary"
                          : "text-text hover:bg-surface2",
                      ].join(" ")}
                    >
                      {l.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        ) : null}

        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
