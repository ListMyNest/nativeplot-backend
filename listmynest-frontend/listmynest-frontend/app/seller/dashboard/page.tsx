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
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";

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
      return "bg-success/15 text-success";
    case "PENDING_REVIEW":
      return "bg-warning/20 text-text";
    case "PAUSED":
      return "bg-surface2 text-text";
    case "SOLD":
      return "bg-danger/15 text-danger";
    default:
      return "bg-surface2 text-text";
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
      <div className="flex min-h-[40dvh] items-center justify-center text-sm text-muted">
        Redirecting…
      </div>
    );
  }

  return (
    <AppDashboardChrome variant="seller">
      <div className="min-h-[100dvh] pb-28 lg:pb-10">
      <header className="border-b border-border bg-surface/80 px-4 py-6 shadow-sm backdrop-blur sm:px-6 md:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium text-muted">Seller</p>
            <h1 className="font-heading text-2xl font-extrabold text-text">
              Welcome back, {sellerName}
            </h1>
            <span className="mt-2 inline-block rounded-full bg-success/15 px-3 py-1 text-xs font-semibold text-success">
              Active account
            </span>
          </div>
          <Link
            href="/seller/add-listing"
            className="flex min-h-[48px] w-full items-center justify-center rounded-xl bg-lmn-primary text-sm font-extrabold text-white shadow-sm transition-[transform,box-shadow] duration-fast hover:shadow-md active:scale-[0.98] sm:w-auto sm:min-w-[200px]"
          >
            + Add New Property
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Card className="bg-surface">
            <p className="text-2xl font-extrabold text-text">
              {statListings || listings.length}
            </p>
            <p className="text-sm font-medium text-muted">Total Listings</p>
          </Card>
          <Card className="bg-surface">
            <p className="text-2xl font-extrabold text-text">{statEnq}</p>
            <p className="text-sm font-medium text-muted">Total Enquiries</p>
          </Card>
          <Card className="bg-surface">
            <p className="text-2xl font-extrabold text-text">{statVisits}</p>
            <p className="text-sm font-medium text-muted">Total Visits</p>
          </Card>
        </div>
      </header>

      <div className="mx-auto max-w-4xl space-y-8 px-4 py-6 sm:px-6 md:px-8">
        {error ? (
          <p className="rounded-xl border border-danger/25 bg-surface px-4 py-3 text-sm text-danger shadow-sm">
            {error}
          </p>
        ) : null}

        <section className="rounded-2xl border-2 border-border bg-surface p-4 shadow-md">
          <h2 className="font-heading text-lg font-extrabold text-text">
            Visit requests
          </h2>
          <p className="mt-1 text-xs text-muted">
            Bookings from buyers appear here as soon as they submit a slot.
          </p>
          {!loading && visits.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No visits yet.</p>
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
                    className="rounded-xl border border-border bg-surface2 px-3 py-2 text-sm"
                  >
                    <p className="font-semibold text-text">{title}</p>
                    <p className="text-xs text-muted">
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
          <section className="rounded-2xl border-2 border-border bg-surface p-4 shadow-md">
            <h2 className="font-heading text-lg font-extrabold text-text">
              Recent enquiry mix
            </h2>
            <p className="mt-2 text-sm text-muted">
              WhatsApp leads:{" "}
              {num(leadSummary.waLeads ?? leadSummary.wa_leads)} · Call clicks:{" "}
              {num(leadSummary.callLeads ?? leadSummary.call_leads)} · Visit
              requests:{" "}
              {num(leadSummary.visitRequests ?? leadSummary.visit_requests)}
            </p>
            <p className="mt-2 text-xs text-muted">
              For visit requests, call buyers back from your registered number
              within the hour when possible.
            </p>
          </section>
        ) : null}

        <section>
          <h2 className="font-heading mb-3 text-lg font-extrabold text-text">
            My listings
          </h2>
          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {[1, 2].map((k) => (
                <div
                  key={k}
                  className="h-40 animate-pulse rounded-2xl bg-surface2"
                />
              ))}
            </div>
          ) : listings.length === 0 ? (
            <p className="text-sm text-muted">No listings yet.</p>
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
                    className="overflow-hidden rounded-3xl border-2 border-border bg-surface shadow-md transition-[transform,box-shadow] duration-base hover:-translate-y-1 hover:shadow-lg"
                  >
                    <div className="relative aspect-video bg-surface2">
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
                        <div className="flex size-full items-center justify-center text-3xl text-muted">
                          🏠
                        </div>
                      )}
                    </div>
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="line-clamp-2 text-base font-extrabold text-text">
                          {listing.title}
                        </p>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${statusBadgeClass(st)}`}
                        >
                          {st.replace(/_/g, " ")}
                        </span>
                      </div>
                      <p className="mt-1 text-base font-extrabold text-lmn-primary">
                        {price}
                      </p>
                      <p className="text-xs text-muted">
                        {listing.view_count} views · {listing.locality},{" "}
                        {listing.city}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {st === "ACTIVE" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={actionId === listing.id}
                            onClick={() =>
                              void runStatus(listing.id, "PAUSED", "Pause?")
                            }
                            className="min-h-[40px] flex-1"
                          >
                            Pause
                          </Button>
                        ) : null}
                        {st === "PAUSED" ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={actionId === listing.id}
                            onClick={() => void runStatus(listing.id, "ACTIVE")}
                            className="min-h-[40px] flex-1 text-success"
                          >
                            Activate
                          </Button>
                        ) : null}
                        {st !== "SOLD" ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={actionId === listing.id}
                            onClick={() =>
                              void runStatus(
                                listing.id,
                                "SOLD",
                                "Mark this listing as sold?"
                              )
                            }
                            className="min-h-[40px] flex-1 bg-lmn-primary/10 text-lmn-primary hover:bg-lmn-primary/15"
                          >
                            Mark Sold
                          </Button>
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
          className="min-h-[48px] text-sm font-semibold text-muted underline decoration-border underline-offset-4 hover:text-text"
        >
          Log out
        </button>
      </div>
    </div>
    </AppDashboardChrome>
  );
}
