"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  getAgentDashboard,
  getSellerDashboard,
  getSellerLeadSummary,
} from "../../lib/api";
import { useAuthStore } from "../../lib/store";
import { showToast } from "../../lib/toast";

function num(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string" && v) {
    const n = Number(v);
    return Number.isNaN(n) ? 0 : n;
  }
  return 0;
}

export default function AccountPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const role = useAuthStore((s) => s.role);
  const userName = useAuthStore((s) => s.userName);
  const logout = useAuthStore((s) => s.logout);
  const hydrateFromStorage = useAuthStore((s) => s.hydrateFromStorage);

  const [sellerDash, setSellerDash] = useState<Record<string, unknown> | null>(
    null
  );
  const [leadSummary, setLeadSummary] = useState<Record<string, unknown> | null>(
    null
  );
  const [agentDash, setAgentDash] = useState<Record<string, unknown> | null>(
    null
  );

  useEffect(() => {
    hydrateFromStorage();
  }, [hydrateFromStorage]);

  useEffect(() => {
    const r = String(role ?? "").toUpperCase();
    if (!token) return;
    if (r === "SELLER") {
      void (async () => {
        try {
          const [d, l] = await Promise.all([
            getSellerDashboard(),
            getSellerLeadSummary() as Promise<Record<string, unknown>>,
          ]);
          setSellerDash(d);
          setLeadSummary(l);
        } catch {
          showToast("Could not load account stats.", "error");
        }
      })();
    }
    if (r === "AGENT") {
      void (async () => {
        try {
          const d = await getAgentDashboard();
          setAgentDash(d);
        } catch {
          showToast("Could not load account stats.", "error");
        }
      })();
    }
  }, [token, role]);

  const onLogout = () => {
    logout();
    if (typeof window !== "undefined") {
      sessionStorage.clear();
    }
    showToast("Signed out.", "info");
    router.replace("/");
  };

  const r = String(role ?? "").toUpperCase();

  if (!token) {
    return (
      <main className="mx-auto max-w-lg space-y-6 py-8">
        <h1 className="text-2xl font-extrabold text-lmn-dark">Hub</h1>
        <p className="text-sm text-lmn-muted">
          Sign in as a seller to manage your listings. New to ListMyNest?
          It&apos;s free to list your property.
        </p>
        <div className="flex flex-col gap-3">
          <Link
            href="/seller/login"
            className="flex min-h-[48px] items-center justify-center rounded-xl bg-lmn-primary text-base font-semibold text-white"
          >
            🏠 I&apos;m a Seller
          </Link>
        </div>
      </main>
    );
  }

  if (r === "SELLER") {
    const listings = num(
      sellerDash?.totalListings ?? sellerDash?.total_listings
    );
    const views = num(sellerDash?.totalViews ?? sellerDash?.total_views);
    const enquiries = num(
      sellerDash?.totalEnquiries ?? sellerDash?.total_enquiries
    );
    const initials = (userName ?? "S")
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

    return (
      <main className="mx-auto max-w-lg space-y-6 py-8">
        <div className="flex items-start gap-4 rounded-2xl border border-lmn-border bg-white p-4 shadow-sm">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-lmn-primary text-lg font-extrabold text-white">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="font-extrabold text-lmn-dark">{userName}</p>
            <span className="mt-1 inline-block rounded-full bg-lmn-verified/15 px-2 py-0.5 text-xs font-semibold text-lmn-verified">
              Verified Seller
            </span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Listings", value: listings },
            { label: "Views", value: views },
            { label: "Enquiries", value: enquiries },
          ].map((x) => (
            <div
              key={x.label}
              className="rounded-xl border border-lmn-border bg-white p-3 text-center shadow-sm"
            >
              <p className="text-xl font-extrabold text-lmn-dark">{x.value}</p>
              <p className="text-xs text-lmn-muted">{x.label}</p>
            </div>
          ))}
        </div>
        {leadSummary ? (
          <div className="rounded-xl border border-lmn-border bg-lmn-card p-4 text-sm text-lmn-muted">
            <p className="font-semibold text-lmn-dark">Lead activity</p>
            <p className="mt-2">
              WhatsApp: {num(leadSummary.waLeads ?? leadSummary.wa_leads)} ·
              Calls: {num(leadSummary.callLeads ?? leadSummary.call_leads)} ·
              Visits:{" "}
              {num(
                leadSummary.visitRequests ?? leadSummary.visit_requests
              )}
            </p>
          </div>
        ) : null}
        <nav className="space-y-1 rounded-2xl border border-lmn-border bg-white p-2 shadow-sm">
          <MenuRow href="/seller/dashboard" label="📋 My Listings" />
          <MenuRow href="/seller/add-listing" label="➕ Add Property" />
          <MenuRow href="#" label="📊 Analytics" muted />
          <MenuRow href="#" label="🔔 Notifications" muted />
          <MenuRow href="#" label="❓ Help & Support" muted />
          <button
            type="button"
            onClick={onLogout}
            className="flex min-h-[48px] w-full items-center justify-between rounded-xl px-4 text-left text-sm font-semibold text-lmn-primary"
          >
            🚪 Logout
            <span className="text-lmn-muted">›</span>
          </button>
        </nav>
      </main>
    );
  }

  if (r === "AGENT") {
    const leadsToday = num(agentDash?.leadsToday ?? agentDash?.leads_today);
    const visitsToday = num(
      agentDash?.visitsToday ?? agentDash?.visits_today
    );
    const visitsTotal = num(
      agentDash?.totalVisits ?? agentDash?.total_visits
    );
    const initials = (userName ?? "A")
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

    return (
      <main className="mx-auto max-w-lg space-y-6 py-8">
        <div className="flex items-start gap-4 rounded-2xl border border-lmn-border bg-white p-4 shadow-sm">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-lmn-verified text-lg font-extrabold text-white">
            {initials}
          </div>
          <div>
            <p className="font-extrabold text-lmn-dark">{userName}</p>
            <span className="mt-1 inline-block rounded-full bg-lmn-verified/15 px-2 py-0.5 text-xs font-semibold text-lmn-verified">
              Verified Agent
            </span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Leads today", value: leadsToday },
            { label: "Visits today", value: visitsToday },
            { label: "Total visits", value: visitsTotal },
          ].map((x) => (
            <div
              key={x.label}
              className="rounded-xl border border-lmn-border bg-white p-3 text-center shadow-sm"
            >
              <p className="text-xl font-extrabold text-lmn-dark">{x.value}</p>
              <p className="text-xs text-lmn-muted">{x.label}</p>
            </div>
          ))}
        </div>
        <nav className="space-y-1 rounded-2xl border border-lmn-border bg-white p-2 shadow-sm">
          <MenuRow href="/agent/dashboard" label="📋 My Leads" />
          <MenuRow href="/agent/dashboard" label="📅 Visit Schedule" />
          <MenuRow href="#" label="🔔 Notifications" muted />
          <button
            type="button"
            onClick={onLogout}
            className="flex min-h-[48px] w-full items-center justify-between rounded-xl px-4 text-left text-sm font-semibold text-lmn-primary"
          >
            🚪 Logout
            <span className="text-lmn-muted">›</span>
          </button>
        </nav>
      </main>
    );
  }

  if (r === "ADMIN") {
    return (
      <main className="mx-auto max-w-lg space-y-6 py-8">
        <div className="rounded-2xl border border-lmn-border bg-white p-4 shadow-sm">
          <span className="rounded-full bg-lmn-dark px-3 py-1 text-xs font-bold text-white">
            Admin Portal
          </span>
          <p className="mt-3 font-extrabold text-lmn-dark">{userName}</p>
        </div>
        <nav className="space-y-1 rounded-2xl border border-lmn-border bg-white p-2 shadow-sm">
          <MenuRow href="/admin/dashboard" label="📊 Dashboard" />
          <MenuRow href="/admin/dashboard" label="🏠 Manage Listings" />
          <MenuRow href="/admin/dashboard" label="👥 Manage Agents" />
          <MenuRow href="#" label="📜 Audit Log" muted />
          <button
            type="button"
            onClick={onLogout}
            className="flex min-h-[48px] w-full items-center justify-between rounded-xl px-4 text-left text-sm font-semibold text-lmn-primary"
          >
            🚪 Logout
            <span className="text-lmn-muted">›</span>
          </button>
        </nav>
      </main>
    );
  }

  return (
    <main className="py-8">
      <p className="text-lmn-muted">Unknown role. Please log in again.</p>
      <button
        type="button"
        onClick={onLogout}
        className="mt-4 min-h-[48px] text-lmn-primary"
      >
        Logout
      </button>
    </main>
  );
}

function MenuRow({
  href,
  label,
  muted,
}: {
  href: string;
  label: string;
  muted?: boolean;
}) {
  if (muted || href === "#") {
    return (
      <div className="flex min-h-[48px] items-center justify-between rounded-xl px-4 text-sm text-lmn-muted opacity-60">
        {label}
        <span>›</span>
      </div>
    );
  }
  return (
    <Link
      href={href}
      className="flex min-h-[48px] items-center justify-between rounded-xl px-4 text-sm font-semibold text-lmn-dark hover:bg-lmn-card"
    >
      {label}
      <span className="text-lmn-muted">›</span>
    </Link>
  );
}
