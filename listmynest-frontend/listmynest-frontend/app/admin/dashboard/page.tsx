"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";

import { AppDashboardChrome } from "../../../components/layout/AppDashboardChrome";
import { Download } from "lucide-react";

import {
  adminActivateListing,
  adminCreateAgent,
  adminCreateSeller,
  adminDownloadVisitsCsv,
  adminGetAgents,
  adminGetProperties,
  adminGetSellers,
  adminGetVisits,
  adminRejectListing,
  adminUpdateVisitStatus,
  ApiError,
  getApiErrorMessage,
} from "../../../lib/api";
import { digitsToIndiaE164, isTenIndiaDigits } from "../../../lib/phone";
import { useAuthStore } from "../../../lib/store";
import { showToast } from "../../../lib/toast";
import { PhoneDigitsField } from "../../../components/ui/PhoneDigitsField";

type Tab = "listings" | "visits" | "sellers" | "agents";

/** Keeps skeleton visible briefly so fast networks still see layout feedback. */
const MIN_SKELETON_MS = 420;

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

function ymdLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function defaultVisitExportRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 30);
  return { from: ymdLocal(from), to: ymdLocal(to) };
}

function AdminListingsSkeleton({
  rows = 5,
  className = "mt-4",
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <ul className={`${className} space-y-3`.trim()} aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <li
          key={i}
          className="rounded-2xl border border-[#D2C6BC] bg-[#EDE4DC] p-4 shadow-sm"
        >
          <div className="h-4 w-[min(72%,280px)] rounded-lg bg-[#C9B8A8] animate-pulse" />
          <div className="mt-3 h-3 w-[min(40%,160px)] rounded-md bg-[#BFB0A0] animate-pulse" />
          <div className="mt-4 flex gap-2">
            <div className="h-9 w-24 rounded-xl bg-[#B5A696] animate-pulse" />
            <div className="h-9 w-20 rounded-xl bg-[#B5A696] animate-pulse" />
          </div>
        </li>
      ))}
    </ul>
  );
}

function AdminVisitsSkeleton({
  rows = 4,
  className = "mt-5",
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div className={`${className} space-y-3`.trim()} aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-[#D2C6BC] bg-[#EDE4DC] p-4 shadow-sm md:p-5"
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-[min(85%,320px)] rounded-lg bg-[#C9B8A8] animate-pulse" />
              <div className="h-3 w-[min(60%,240px)] rounded-md bg-[#BFB0A0] animate-pulse" />
              <div className="h-6 w-24 rounded-full bg-[#B5A696] animate-pulse" />
            </div>
            <div className="flex shrink-0 gap-2 md:flex-col md:items-end">
              <div className="h-10 w-32 rounded-xl bg-[#B5A696] animate-pulse" />
              <div className="h-10 w-28 rounded-xl bg-[#B5A696] animate-pulse" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function visitStatusBadgeClass(status: string): string {
  const u = status.toUpperCase();
  if (u === "VISITED") {
    return "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200";
  }
  if (u === "CANCELLED") {
    return "bg-stone-200 text-stone-700 ring-1 ring-stone-300";
  }
  if (u === "NOT_VISITED") {
    return "bg-amber-100 text-amber-950 ring-1 ring-amber-200";
  }
  return "bg-sky-100 text-sky-950 ring-1 ring-sky-200";
}

function canMarkVisitCompleted(status: string): boolean {
  const u = status.toUpperCase();
  return ["SCHEDULED", "CONFIRMED", "RESCHEDULED", "NOT_VISITED"].includes(u);
}

function canMarkVisitPending(status: string): boolean {
  return status.toUpperCase() === "VISITED";
}

function humanizeAdminCreateError(err: unknown, fallback: string): string {
  if (!(err instanceof Error)) return fallback;
  const msg = err.message || fallback;
  // Backend uses short codes via AppException.message.
  if (!(err instanceof ApiError)) return msg;
  switch (err.message) {
    case "PHONE_IN_USE":
      return "That phone number is already in use.";
    case "UNAUTHORIZED":
      return "Your session expired. Please log in again.";
    default:
      return msg;
  }
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const role = useAuthStore((s) => s.role);
  const logout = useAuthStore((s) => s.logout);
  const hydrateFromStorage = useAuthStore((s) => s.hydrateFromStorage);

  const [tab, setTab] = useState<Tab>("listings");
  const [statusFilter, setStatusFilter] = useState("");
  const [listings, setListings] = useState<Record<string, unknown>[]>([]);
  const [agents, setAgents] = useState<Record<string, unknown>[]>([]);
  const [sellers, setSellers] = useState<Record<string, unknown>[]>([]);
  const [visitRows, setVisitRows] = useState<Record<string, unknown>[]>([]);
  const [visitPage, setVisitPage] = useState(0);
  const [visitTotal, setVisitTotal] = useState(0);
  const [visitSize] = useState(30);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [visitsLoading, setVisitsLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [visitUpdatingId, setVisitUpdatingId] = useState<string | null>(null);
  const [visitExportFrom, setVisitExportFrom] = useState(
    () => defaultVisitExportRange().from
  );
  const [visitExportTo, setVisitExportTo] = useState(
    () => defaultVisitExportRange().to
  );
  const [visitExporting, setVisitExporting] = useState(false);

  const [agentName, setAgentName] = useState("");
  const [agentDigits, setAgentDigits] = useState("");
  const [agentWaDigits, setAgentWaDigits] = useState("");
  const [agentCities, setAgentCities] = useState("Bidar,Humnabad");
  const [agentPassword, setAgentPassword] = useState("");

  const [sellerName, setSellerName] = useState("");
  const [sellerDigits, setSellerDigits] = useState("");
  const [sellerPassword, setSellerPassword] = useState("");
  const [sellerPreferredAgentId, setSellerPreferredAgentId] = useState("");
  const [sellerIsAgent, setSellerIsAgent] = useState(false);

  useEffect(() => {
    hydrateFromStorage();
  }, [hydrateFromStorage]);

  useEffect(() => {
    if (!token || String(role).toUpperCase() !== "ADMIN") {
      router.replace("/admin/login");
    }
  }, [token, role, router]);

  const loadListings = useCallback(async () => {
    const t0 = Date.now();
    setListingsLoading(true);
    try {
      const raw = await adminGetProperties(
        statusFilter ? { status: statusFilter } : {}
      );
      setListings(
        (raw.content as Record<string, unknown>[]) ?? []
      );
    } catch {
      showToast("Could not load listings.", "error");
    } finally {
      const elapsed = Date.now() - t0;
      if (elapsed < MIN_SKELETON_MS) {
        await sleep(MIN_SKELETON_MS - elapsed);
      }
      setListingsLoading(false);
    }
  }, [statusFilter]);

  const loadAgents = useCallback(async () => {
    setBusy(true);
    try {
      const rows = await adminGetAgents();
      setAgents(rows as Record<string, unknown>[]);
    } catch {
      showToast("Could not load agents.", "error");
    } finally {
      setBusy(false);
    }
  }, []);

  const loadSellers = useCallback(async () => {
    setBusy(true);
    try {
      const rows = await adminGetSellers();
      setSellers(rows as Record<string, unknown>[]);
    } catch {
      showToast("Could not load sellers.", "error");
    } finally {
      setBusy(false);
    }
  }, []);

  const loadVisits = useCallback(async () => {
    const t0 = Date.now();
    setVisitsLoading(true);
    try {
      const raw = await adminGetVisits({ page: visitPage, size: visitSize });
      setVisitRows((raw.content as Record<string, unknown>[]) ?? []);
      setVisitTotal(Number(raw.total ?? 0));
    } catch {
      showToast("Could not load visits.", "error");
    } finally {
      const elapsed = Date.now() - t0;
      if (elapsed < MIN_SKELETON_MS) {
        await sleep(MIN_SKELETON_MS - elapsed);
      }
      setVisitsLoading(false);
    }
  }, [visitPage, visitSize]);

  useEffect(() => {
    if (!token || String(role).toUpperCase() !== "ADMIN") return;
    if (tab === "listings") void loadListings();
  }, [tab, statusFilter, token, role, loadListings]);

  useEffect(() => {
    if (!token || String(role).toUpperCase() !== "ADMIN") return;
    if (tab === "agents") void loadAgents();
    if (tab === "sellers") void loadSellers();
    if (tab === "visits") void loadVisits();
  }, [tab, token, role, loadAgents, loadSellers, loadVisits]);

  useEffect(() => {
    if (!token || String(role).toUpperCase() !== "ADMIN") return;
    // Seller creation needs agent list (for assigning preferred agent).
    if (tab === "sellers") void loadAgents();
  }, [tab, token, role, loadAgents]);

  const onActivate = async (id: string) => {
    try {
      await adminActivateListing(id);
      showToast("Listing activated.", "success");
      await loadListings();
    } catch (e) {
      showToast(
        e instanceof Error ? e.message : "Could not activate.",
        "error"
      );
    }
  };

  const onReject = async (id: string) => {
    try {
      await adminRejectListing(id);
      showToast("Listing rejected.", "success");
      await loadListings();
    } catch (e) {
      showToast(
        e instanceof Error ? e.message : "Could not update.",
        "error"
      );
    }
  };

  const onCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentName.trim()) {
      showToast("Enter agent name.", "error");
      return;
    }
    if (agentPassword.trim().length < 6) {
      showToast("Password must be at least 6 characters.", "error");
      return;
    }
    if (!isTenIndiaDigits(agentDigits)) {
      showToast("Enter a valid 10-digit mobile number for the agent.", "error");
      return;
    }
    const phoneE164 = digitsToIndiaE164(agentDigits);
    let waE164 = phoneE164;
    if (agentWaDigits.replace(/\D/g, "").length > 0) {
      if (!isTenIndiaDigits(agentWaDigits)) {
        showToast("WhatsApp must be 10 digits or leave blank.", "error");
        return;
      }
      waE164 = digitsToIndiaE164(agentWaDigits);
    }
    try {
      setBusy(true);
      await adminCreateAgent({
        name: agentName.trim(),
        phone: phoneE164,
        whatsappNumber: waE164,
        assignedCities: agentCities.split(",").map((s) => s.trim()),
        password: agentPassword,
      });
      showToast("Agent created.", "success");
      setAgentName("");
      setAgentDigits("");
      setAgentWaDigits("");
      setAgentPassword("");
      await loadAgents();
    } catch (err) {
      showToast(
        humanizeAdminCreateError(err, "Could not create agent."),
        "error"
      );
    } finally {
      setBusy(false);
    }
  };

  const onCreateSeller = async (e: FormEvent) => {
    e.preventDefault();
    if (!sellerName.trim()) {
      showToast("Enter seller name.", "error");
      return;
    }
    if (sellerPassword.trim().length < 6) {
      showToast("Password must be at least 6 characters.", "error");
      return;
    }
    if (!isTenIndiaDigits(sellerDigits)) {
      showToast("Enter a valid 10-digit mobile number for the seller.", "error");
      return;
    }
    try {
      setBusy(true);
      const phone = digitsToIndiaE164(sellerDigits);
      if (sellerIsAgent) {
        await adminCreateAgent({
          name: sellerName.trim(),
          phone,
          whatsappNumber: phone,
          assignedCities: "",
          password: sellerPassword,
        });
        showToast("Agent created.", "success");
      } else {
        await adminCreateSeller({
          name: sellerName.trim(),
          phone,
          password: sellerPassword,
        });
        showToast("Seller created.", "success");
      }
      setSellerName("");
      setSellerDigits("");
      setSellerPassword("");
      setSellerIsAgent(false);
      await loadSellers();
    } catch (err) {
      showToast(
        humanizeAdminCreateError(err, "Could not create seller."),
        "error"
      );
    } finally {
      setBusy(false);
    }
  };

  const onDownloadVisitsCsv = async () => {
    if (visitExportFrom > visitExportTo) {
      showToast('"From" date must be on or before "To" date.', "error");
      return;
    }
    setVisitExporting(true);
    try {
      const { blob, filename } = await adminDownloadVisitsCsv(
        {
          dateFrom: visitExportFrom,
          dateTo: visitExportTo,
        },
        { token }
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast("Download started (UTF-8 CSV — open in Excel).", "success");
    } catch (e) {
      showToast(
        getApiErrorMessage(e, "Could not export visits."),
        "error"
      );
    } finally {
      setVisitExporting(false);
    }
  };

  const onAdminVisitStatus = async (
    visitId: string,
    status: "VISITED" | "SCHEDULED"
  ) => {
    setVisitUpdatingId(visitId);
    try {
      await adminUpdateVisitStatus(visitId, { status });
      showToast(
        status === "VISITED"
          ? "Visit marked as completed."
          : "Visit marked as pending.",
        "success"
      );
      await loadVisits();
    } catch (e) {
      showToast(
        e instanceof Error ? e.message : "Could not update visit.",
        "error"
      );
    } finally {
      setVisitUpdatingId(null);
    }
  };

  if (!token || String(role).toUpperCase() !== "ADMIN") {
    return null;
  }

  return (
    <AppDashboardChrome variant="admin">
    <div className="min-h-[100dvh] bg-gradient-to-b from-[#FFF7EE] via-[#FAF8F5] to-[#FAF8F5] px-4 py-8 pb-16 md:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-wide text-[#7B6E62]">
              ListMyNest Admin
            </p>
            <h1 className="text-2xl font-extrabold text-[#1A1108]">
              Dashboard
            </h1>
          </div>
          <button
            type="button"
            onClick={() => {
              logout();
              router.replace("/admin/login");
            }}
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-border bg-white px-4 text-sm font-semibold text-[#1A1108] shadow-sm hover:bg-[#FFF7EE]"
          >
            Log out
          </button>
        </div>

        <div className="mt-6 rounded-2xl border-2 border-border bg-white/80 p-2 shadow-md backdrop-blur">
          {(
            [
              ["listings", "Listings"],
              ["visits", "Visits"],
              ["sellers", "Sellers"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              className={
                tab === k
                  ? "rounded-xl bg-[#1A1108] px-4 py-2.5 text-sm font-semibold text-white shadow-sm"
                  : "rounded-xl px-4 py-2.5 text-sm font-semibold text-[#7B6E62] hover:bg-[#FFF7EE]"
              }
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "listings" ? (
          <div className="mt-6">
            <div className="flex flex-col gap-3 rounded-2xl border-2 border-border bg-white p-4 shadow-md sm:flex-row sm:items-end sm:justify-between">
              <label className="text-xs font-semibold text-[#7B6E62]">
                Status
                <select
                  className="mt-2 min-h-[44px] w-full max-w-xs rounded-xl border border-border bg-white px-3 py-2 text-sm font-semibold text-[#1A1108] outline-none focus:ring-2 focus:ring-[#E63946]/20"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">All</option>
                  <option value="NEW">NEW</option>
                  <option value="PENDING_REVIEW">PENDING REVIEW</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </label>
              <button
                type="button"
                onClick={() => void loadListings()}
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#1A1108] px-4 text-sm font-semibold text-white shadow-sm hover:opacity-95"
              >
                Refresh
              </button>
            </div>
            {listingsLoading ? (
              <AdminListingsSkeleton />
            ) : (
                <ul className="mt-4 space-y-3">
                  {listings.map((p) => {
                    const id = String(p.id ?? "");
                    const title = String(p.title ?? "");
                    const city = String(p.city ?? "");
                    const st = String(p.status ?? "");
                    return (
                      <li
                        key={id}
                        className="rounded-2xl border-2 border-border bg-white p-4 shadow-md"
                      >
                        <Link
                          href={`/admin/properties/${encodeURIComponent(id)}`}
                          className="block text-sm font-extrabold text-[#1A1108] underline decoration-border underline-offset-4 hover:decoration-[#E63946]"
                        >
                          {title || "Property"}
                        </Link>
                        <p className="text-xs text-[#7B6E62]">
                          {city} · {st}
                        </p>
                        <div className="mt-2 flex gap-2">
                          <button
                            type="button"
                            onClick={() => void onActivate(id)}
                            className="rounded-xl bg-[#1E8449] px-3 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-95"
                          >
                            Activate
                          </button>
                          <button
                            type="button"
                            onClick={() => void onReject(id)}
                            className="rounded-xl bg-[#922B21] px-3 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-95"
                          >
                            Reject
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
            )}
          </div>
        ) : null}

        {tab === "visits" ? (
          <div className="mt-6 space-y-4">
            <div className="flex flex-col gap-3 rounded-2xl border-2 border-border bg-gradient-to-br from-white to-[#FFF9F3] p-4 shadow-md sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-extrabold text-[#1A1108]">
                  Scheduled visits
                </p>
                <p className="text-xs font-medium text-[#7B6E62]">
                  Newest first. Mark completed when the buyer has been seen, or
                  pending to reopen.
                </p>
              </div>
              <button
                type="button"
                disabled={visitsLoading}
                onClick={() => void loadVisits()}
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#1A1108] px-4 text-sm font-semibold text-white shadow-sm hover:opacity-95 disabled:opacity-50"
              >
                {visitsLoading ? "Refreshing…" : "Refresh"}
              </button>
            </div>

            <div className="rounded-2xl border-2 border-border bg-white p-4 shadow-md sm:p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-wide text-[#7B6E62]">
                    Export (Excel)
                  </p>
                  <p className="mt-1 text-xs text-[#7B6E62]">
                    UTF-8 CSV with BOM — filtered by{" "}
                    <span className="font-semibold text-[#5C524A]">
                      visit date
                    </span>{" "}
                    (inclusive). Opens directly in Excel.
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                  <label className="flex min-w-[140px] flex-col text-[11px] font-semibold text-[#5C524A]">
                    From
                    <input
                      type="date"
                      value={visitExportFrom}
                      onChange={(e) => setVisitExportFrom(e.target.value)}
                      className="mt-1 min-h-[44px] rounded-xl border border-border bg-[#FFFCF9] px-3 py-2 text-sm font-semibold text-[#1A1108] outline-none focus:ring-2 focus:ring-[#E63946]/20"
                    />
                  </label>
                  <label className="flex min-w-[140px] flex-col text-[11px] font-semibold text-[#5C524A]">
                    To
                    <input
                      type="date"
                      value={visitExportTo}
                      onChange={(e) => setVisitExportTo(e.target.value)}
                      className="mt-1 min-h-[44px] rounded-xl border border-border bg-[#FFFCF9] px-3 py-2 text-sm font-semibold text-[#1A1108] outline-none focus:ring-2 focus:ring-[#E63946]/20"
                    />
                  </label>
                  <button
                    type="button"
                    disabled={visitExporting}
                    onClick={() => void onDownloadVisitsCsv()}
                    className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 self-start rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-50 sm:self-end"
                    title="Download CSV (Excel)"
                  >
                    <Download className="size-5 shrink-0" aria-hidden />
                    <span className="sm:inline">
                      {visitExporting ? "Preparing…" : "Download"}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {visitsLoading && visitRows.length === 0 ? (
              <AdminVisitsSkeleton />
            ) : visitRows.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#D2C6BC] bg-[#F7F0EA] px-6 py-10 text-center">
                <p className="text-sm font-semibold text-[#1A1108]">
                  No visits yet
                </p>
                <p className="mt-1 text-xs text-[#7B6E62]">
                  Buyer visit requests will show up here.
                </p>
              </div>
            ) : (
              <>
                <div className="relative mt-1">
                  {visitsLoading ? (
                    <div
                      className="pointer-events-none absolute inset-0 z-10 flex justify-center rounded-2xl bg-[#FAF8F5]/80 py-6 backdrop-blur-[2px]"
                      aria-hidden
                    >
                      <div className="w-full max-w-2xl opacity-95">
                        <AdminVisitsSkeleton rows={3} className="mt-0" />
                      </div>
                    </div>
                  ) : null}
                  <ul
                    className={`space-y-3 ${visitsLoading ? "min-h-[200px] opacity-45" : ""}`}
                  >
                  {visitRows.map((row) => {
                    const id = String(row.id ?? "");
                    const propId = String(
                      row.propertyId ?? row.property_id ?? ""
                    );
                    const title = String(
                      row.propertyTitle ?? row.property_title ?? "—"
                    );
                    const phone = String(
                      row.buyerPhone ?? row.buyer_phone ?? "—"
                    );
                    const d = String(row.visitDate ?? row.visit_date ?? "");
                    const t = String(row.visitTime ?? row.visit_time ?? "");
                    const st = String(row.status ?? "");
                    const updating = visitUpdatingId === id;
                    const showDone = canMarkVisitCompleted(st);
                    const showPending = canMarkVisitPending(st);
                    return (
                      <li
                        key={id}
                        className="rounded-2xl border-2 border-border bg-white p-4 text-sm shadow-md md:p-5"
                      >
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                          <div className="min-w-0 flex-1 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${visitStatusBadgeClass(st)}`}
                              >
                                {st.replace(/_/g, " ")}
                              </span>
                            </div>
                            {propId ? (
                              <Link
                                href={`/property/${encodeURIComponent(propId)}`}
                                className="block text-base font-bold text-[#1A1108] underline decoration-border underline-offset-2 hover:decoration-[#E63946]"
                              >
                                {title}
                              </Link>
                            ) : (
                              <p className="text-base font-bold text-[#1A1108]">
                                {title}
                              </p>
                            )}
                            <div className="flex flex-col gap-1 text-xs text-[#7B6E62] sm:flex-row sm:flex-wrap sm:gap-x-4">
                              <span>
                                <span className="font-semibold text-[#5C524A]">
                                  Date
                                </span>{" "}
                                {d}
                              </span>
                              <span>
                                <span className="font-semibold text-[#5C524A]">
                                  Time
                                </span>{" "}
                                {t}
                              </span>
                              <span>
                                <span className="font-semibold text-[#5C524A]">
                                  Buyer
                                </span>{" "}
                                {phone}
                              </span>
                            </div>
                          </div>
                          <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                            {showDone ? (
                              <button
                                type="button"
                                disabled={updating}
                                onClick={() =>
                                  void onAdminVisitStatus(id, "VISITED")
                                }
                                className="inline-flex min-h-[42px] min-w-[10.5rem] items-center justify-center rounded-xl bg-emerald-700 px-4 text-xs font-bold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-50"
                              >
                                {updating ? "Saving…" : "Mark completed"}
                              </button>
                            ) : null}
                            {showPending ? (
                              <button
                                type="button"
                                disabled={updating}
                                onClick={() =>
                                  void onAdminVisitStatus(id, "SCHEDULED")
                                }
                                className="inline-flex min-h-[42px] min-w-[10.5rem] items-center justify-center rounded-xl border border-[#D2C6BC] bg-[#FFF7EE] px-4 text-xs font-bold text-[#5C4030] shadow-sm hover:bg-[#FFECD9] disabled:opacity-50"
                              >
                                {updating ? "Saving…" : "Mark pending"}
                              </button>
                            ) : null}
                            {!showDone && !showPending ? (
                              <p className="text-[11px] font-medium text-[#7B6E62]">
                                Status can be changed from the agent app, or
                                contact support to adjust cancelled visits.
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                  </ul>
                </div>
                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-border bg-[#FDFBF8] px-4 py-3 text-xs text-[#7B6E62]">
                  <span className="font-semibold text-[#5C524A]">
                    Page {visitPage + 1} · {visitTotal} total
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={visitPage <= 0 || visitsLoading}
                      onClick={() => setVisitPage((p) => Math.max(0, p - 1))}
                      className="rounded-xl border border-border bg-white px-3 py-2 font-semibold text-[#1A1108] shadow-sm disabled:opacity-40"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      disabled={
                        (visitPage + 1) * visitSize >= visitTotal ||
                        visitsLoading
                      }
                      onClick={() => setVisitPage((p) => p + 1)}
                      className="rounded-xl border border-border bg-white px-3 py-2 font-semibold text-[#1A1108] shadow-sm disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : null}

        {tab === "sellers" ? (
          <div className="mt-6 space-y-6">
            <form
              className="rounded-2xl border-2 border-border bg-white p-5 shadow-md"
              onSubmit={(e) => void onCreateSeller(e)}
            >
              <h2 className="text-sm font-extrabold text-[#1A1108]">
                Create account
              </h2>
              <p className="mt-1 text-xs font-medium text-[#7B6E62]">
                Create a Seller (default) or an Agent (checkbox).
              </p>
              <input
                required
                placeholder="Name"
                className="mb-2 mt-4 min-h-[44px] w-full rounded-xl border border-border bg-white px-3 py-2 text-sm font-semibold text-[#1A1108] outline-none focus:ring-2 focus:ring-[#E63946]/20"
                value={sellerName}
                onChange={(e) => setSellerName(e.target.value)}
              />
              <label className="mb-2 flex items-center gap-2 text-xs font-semibold text-[#7B6E62]">
                <input
                  type="checkbox"
                  checked={sellerIsAgent}
                  onChange={(e) => setSellerIsAgent(e.target.checked)}
                />
                Agent?
              </label>
              {/* preferred agent assignment removed (per request) */}
              <div className="mb-2">
                <PhoneDigitsField
                  id="admin-seller-phone"
                  label="Mobile"
                  value={sellerDigits}
                  onChange={setSellerDigits}
                />
              </div>
              <input
                required
                placeholder="Password"
                type="password"
                className="mb-2 min-h-[44px] w-full rounded-xl border border-border bg-white px-3 py-2 text-sm font-semibold text-[#1A1108] outline-none focus:ring-2 focus:ring-[#E63946]/20"
                value={sellerPassword}
                onChange={(e) => setSellerPassword(e.target.value)}
              />
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-xl bg-[#1A1108] py-3 text-sm font-semibold text-white shadow-sm hover:opacity-95 disabled:opacity-50"
              >
                Create
              </button>
            </form>
            <ul className="space-y-2">
              {sellers.map((s) => (
                <li
                  key={String(s.id)}
                  className="rounded-2xl border-2 border-border bg-white p-4 text-sm shadow-md"
                >
                  {String(s.name ?? "")} · {String(s.phone ?? "")}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
    </AppDashboardChrome>
  );
}
