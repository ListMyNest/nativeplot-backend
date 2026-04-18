"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Variant = "seller" | "agent" | "admin";

const NAV: Record<
  Variant,
  { href: string; label: string }[]
> = {
  seller: [
    { href: "/seller/dashboard", label: "Dashboard" },
    { href: "/seller/add-listing", label: "Add listing" },
  ],
  agent: [{ href: "/agent/dashboard", label: "Dashboard" }],
  admin: [{ href: "/admin/dashboard", label: "Dashboard" }],
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

  return (
    <div className="flex min-h-[100dvh] w-full lg:mx-auto lg:max-w-[1280px]">
      <aside className="sticky top-0 hidden h-screen shrink-0 border-r border-lmn-border bg-white px-3 py-8 lg:block lg:w-56">
        <p className="mb-4 text-xs font-bold uppercase tracking-wide text-lmn-muted">
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
                className={
                  active
                    ? "block rounded-lg bg-lmn-primary/10 px-3 py-2.5 text-sm font-semibold text-lmn-primary"
                    : "block rounded-lg px-3 py-2.5 text-sm font-semibold text-lmn-dark hover:bg-lmn-card"
                }
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
