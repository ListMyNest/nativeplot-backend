"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { AppDashboardChrome } from "../../../components/layout/AppDashboardChrome";
import { PropertyRemoteImage } from "../../../components/property/PropertyRemoteImage";
import {
  getSellerDashboard,
  getSellerLeadSummary,
  getSellerListings,
  getSellerMe,
  getSellerVisits,
  toAbsoluteAssetUrl,
  updatePropertyStatus,
} from "../../../lib/api";
import { useAuthStore } from "../../../lib/store";
import { showToast } from "../../../lib/toast";
import { formatPriceRangeLakh } from "../../../lib/utils/formatPrice";
import type { PropertyListItem } from "../../../types";

function num(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string" && v) {
    const n = Number(v);
    return Number.isNaN(n) ? 0 : n;
  }
  return 0;
}

function statusBadgeClass(st: string) {
  switch (st) {
    case "ACTIVE":
      return "bg-emerald-100 text-emerald-800";
    case "PENDING_REVIEW":
      return "bg-amber-100 text-amber-900";
    case "PAUSED":
      return "bg-gray-200 text-gray-800";
    case "SOLD":
      return "bg-red-100 text-red-800";
    default:
      return "bg-lmn-card text-lmn-dark";
  }
}

export default function SellerDashboardPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const role = useAuthStore((s) => s.role);
  const userName = useAuthStore((s) => s.userName);
  const logout = useAuthStore((s) => s.logout);
  const hydrateFromStorage = useAuthStore((s) => s.hydrateFromStorage);

  const [sellerName, setSellerName] = useState(userName ?? "Seller");
  const [dashboard, setDashboard] = useState<Record<string, unknown> | null>(
    null
  );
  const [leadSummary, setLeadSummary] = useState<Record<string, unknown> | null>(
    null
  );
  const [listings, setListings] = useState<PropertyListItem[]>([]);
  const [visits, setVisits] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  useEffect(() => {
    hydrateFromStorage();
  }, [hydrateFromStorage]);

  useEffect(() => {
    const r = String(role ?? "").toUpperCase();
    if (!token || r !== "SELLER") {
      router.replace("/seller/login");
    }
  }, [token, role, router]);

  const loadAll = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [me, dash, list, leads, v] = await Promise.all([
        getSellerMe(),
        getSellerDashboard(),
        getSellerListings(),
        getSellerLeadSummary() as Promise<Record<string, unknown>>,
        getSellerVisits(),
      ]);
      const n =
        typeof me.name === "string" && me.name.trim() ? me.name.trim() : null;
      if (n) setSellerName(n);
      setDashboard(dash);
      setListings(list);
      setLeadSummary(leads);
      setVisits(v);
    } catch {
      setError("Could not load your dashboard.");
      showToast("Could not load dashboard.", "error");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token && String(role).toUpperCase() === "SELLER") void loadAll();
  }, [token, role, loadAll]);

  const statListings = num(
    dashboard?.totalListings ?? dashboard?.total_listings
  );
  const statEnq = num(
    dashboard?.totalEnquiries ?? dashboard?.total_enquiries
  );
  const statVisits = num(dashboard?.totalVisits ?? dashboard?.total_visits);

  const runStatus = async (id: string, status: string, confirmMsg?: string) => {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    setActionId(id);
    try {
      await updatePropertyStatus(id, status);
      showToast("Updated.", "success");
      await loadAll();
    } catch {
      showToast("Could not update status.", "error");
    } finally {
      setActionId(null);
    }
  };

  if (!token || String(role).toUpperCase() !== "SELLER") {
    return (
      <div className="flex min-h-[40dvh] items-center justify-center text-sm text-lmn-muted">
        Redirecting…
      </div>
    );
  }

  return (
    <AppDashboardChrome variant="seller">
    <div className="min-h-[100dvh] pb-28 lg:pb-10">
      <header className="border-b border-lmn-border bg-white px-4 py-6 sm:px-6 md:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium text-lmn-muted">Seller</p>
            <h1 className="text-2xl font-extrabold text-lmn-dark">
              Welcome back, {sellerName}
            </h1>
            <span className="mt-2 inline-block rounded-full bg-lmn-verified/15 px-3 py-1 text-xs font-semibold text-lmn-verified">
              Active account
            </span>
          </div>
          <Link
            href="/seller/add-listing"
            className="flex min-h-[48px] w-full items-center justify-center rounded-xl bg-lmn-primary text-sm font-extrabold text-white sm:w-auto sm:min-w-[200px]"
          >
            + Add New Property
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <p className="text-2xl font-extrabold text-blue-900">
              {statListings || listings.length}
            </p>
            <p className="text-sm font-medium text-blue-800">Total Listings</p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-2xl font-extrabold text-emerald-900">
              {statEnq}
            </p>
            <p className="text-sm font-medium text-emerald-800">
              Total Enquiries
            </p>
          </div>
          <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
            <p className="text-2xl font-extrabold text-orange-900">
              {statVisits}
            </p>
            <p className="text-sm font-medium text-orange-800">Total Visits</p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl space-y-8 px-4 py-6 sm:px-6 md:px-8">
        {error ? (
          <p className="rounded-xl border border-lmn-primary/30 bg-red-50 px-4 py-3 text-sm text-lmn-primary">
            {error}
          </p>
        ) : null}

        <section className="rounded-2xl border border-lmn-border bg-white p-4 shadow-sm">
          <h2 className="text-lg font-extrabold text-lmn-dark">
            Visit requests
          </h2>
          <p className="mt-1 text-xs text-lmn-muted">
            Bookings from buyers appear here as soon as they submit a slot.
          </p>
          {!loading && visits.length === 0 ? (
            <p className="mt-3 text-sm text-lmn-muted">No visits yet.</p>
          ) : null}
          {!loading && visits.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {visits.map((row) => {
                const id = String(row.id ?? "");
                const title = String(
                  row.propertyTitle ?? row.property_title ?? "Property"
                );
                const phone = String(row.buyerPhone ?? row.buyer_phone ?? "—");
                const d = String(row.visitDate ?? row.visit_date ?? "");
                const t = String(row.visitTime ?? row.visit_time ?? "");
                const st = String(row.status ?? "");
                return (
                  <li
                    key={id}
                    className="rounded-xl border border-lmn-border bg-lmn-card px-3 py-2 text-sm"
                  >
                    <p className="font-semibold text-lmn-dark">{title}</p>
                    <p className="text-xs text-lmn-muted">
                      {d} · {t} · {phone}
                    </p>
                    {st ? (
                      <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-lmn-primary">
                        {st.replace(/_/g, " ")}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : null}
        </section>

        {leadSummary ? (
          <section className="rounded-2xl border border-lmn-border bg-white p-4 shadow-sm">
            <h2 className="text-lg font-extrabold text-lmn-dark">
              Recent enquiry mix
            </h2>
            <p className="mt-2 text-sm text-lmn-muted">
              WhatsApp leads:{" "}
              {num(leadSummary.waLeads ?? leadSummary.wa_leads)} · Call clicks:{" "}
              {num(leadSummary.callLeads ?? leadSummary.call_leads)} · Visit
              requests:{" "}
              {num(leadSummary.visitRequests ?? leadSummary.visit_requests)}
            </p>
            <p className="mt-2 text-xs text-lmn-muted">
              For visit requests, call buyers back from your registered number
              within the hour when possible.
            </p>
          </section>
        ) : null}

        <section>
          <h2 className="mb-3 text-lg font-extrabold text-lmn-dark">
            My listings
          </h2>
          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {[1, 2].map((k) => (
                <div
                  key={k}
                  className="h-40 animate-pulse rounded-2xl bg-lmn-card"
                />
              ))}
            </div>
          ) : listings.length === 0 ? (
            <p className="text-sm text-lmn-muted">No listings yet.</p>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2">
              {listings.map((listing) => {
                const price = formatPriceRangeLakh(
                  listing.price_min,
                  listing.price_max
                );
                const st = String(listing.status).toUpperCase();
                return (
                  <li
                    key={listing.id}
                    className="overflow-hidden rounded-2xl border border-lmn-border bg-white shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="relative aspect-video bg-lmn-card">
                      {listing.primary_photo ? (
                        <PropertyRemoteImage
                          src={
                            toAbsoluteAssetUrl(listing.primary_photo) ??
                            listing.primary_photo
                          }
                          alt=""
                          fill
                          sizes="(max-width: 1024px) 100vw, 400px"
                          className="size-full"
                        />
                      ) : (
                        <div className="flex size-full items-center justify-center text-3xl text-lmn-muted">
                          🏠
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <p className="line-clamp-2 font-bold text-lmn-dark">
                          {listing.title}
                        </p>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${statusBadgeClass(st)}`}
                        >
                          {st.replace(/_/g, " ")}
                        </span>
                      </div>
                      <p className="mt-1 font-extrabold text-lmn-primary">
                        {price}
                      </p>
                      <p className="text-xs text-lmn-muted">
                        {listing.view_count} views · {listing.locality},{" "}
                        {listing.city}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {st === "ACTIVE" ? (
                          <button
                            type="button"
                            disabled={actionId === listing.id}
                            onClick={() =>
                              void runStatus(listing.id, "PAUSED", "Pause?")
                            }
                            className="min-h-[40px] flex-1 rounded-lg border border-lmn-border text-xs font-semibold text-lmn-dark disabled:opacity-50"
                          >
                            Pause
                          </button>
                        ) : null}
                        {st === "PAUSED" ? (
                          <button
                            type="button"
                            disabled={actionId === listing.id}
                            onClick={() => void runStatus(listing.id, "ACTIVE")}
                            className="min-h-[40px] flex-1 rounded-lg bg-lmn-verified/15 text-xs font-semibold text-lmn-verified disabled:opacity-50"
                          >
                            Activate
                          </button>
                        ) : null}
                        {st !== "SOLD" ? (
                          <button
                            type="button"
                            disabled={actionId === listing.id}
                            onClick={() =>
                              void runStatus(
                                listing.id,
                                "SOLD",
                                "Mark this listing as sold?"
                              )
                            }
                            className="min-h-[40px] flex-1 rounded-lg bg-lmn-primary/10 text-xs font-semibold text-lmn-primary disabled:opacity-50"
                          >
                            Mark Sold
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <button
          type="button"
          onClick={() => {
            logout();
            router.replace("/seller/login");
          }}
          className="min-h-[48px] text-sm font-semibold text-lmn-muted underline"
        >
          Log out
        </button>
      </div>
    </div>
    </AppDashboardChrome>
  );
}
