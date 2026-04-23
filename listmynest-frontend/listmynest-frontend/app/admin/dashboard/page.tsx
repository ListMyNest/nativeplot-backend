"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";

import { AppDashboardChrome } from "../../../components/layout/AppDashboardChrome";
import {
  adminActivateListing,
  adminCreateAgent,
  adminCreateSeller,
  adminGetAgents,
  adminGetProperties,
  adminGetSellers,
  adminGetVisits,
  adminRejectListing,
} from "../../../lib/api";
import { digitsToIndiaE164, isTenIndiaDigits } from "../../../lib/phone";
import { useAuthStore } from "../../../lib/store";
import { showToast } from "../../../lib/toast";
import { PhoneDigitsField } from "../../../components/ui/PhoneDigitsField";
import { ApiError } from "../../../lib/api";

type Tab = "listings" | "visits" | "sellers";

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
  const [loading, setLoading] = useState(false);

  const [agentName, setAgentName] = useState("");
  const [agentDigits, setAgentDigits] = useState("");
  const [agentWaDigits, setAgentWaDigits] = useState("");
  const [agentCities, setAgentCities] = useState("Bidar,Humnabad");
  const [agentPassword, setAgentPassword] = useState("");

  const [sellerName, setSellerName] = useState("");
  const [sellerDigits, setSellerDigits] = useState("");
  const [sellerPassword, setSellerPassword] = useState("");
  const [sellerPreferredAgentId, setSellerPreferredAgentId] = useState("");

  useEffect(() => {
    hydrateFromStorage();
  }, [hydrateFromStorage]);

  useEffect(() => {
    if (!token || String(role).toUpperCase() !== "ADMIN") {
      router.replace("/admin/login");
    }
  }, [token, role, router]);

  const loadListings = useCallback(async () => {
    setLoading(true);
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
      setLoading(false);
    }
  }, [statusFilter]);

  const loadAgents = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await adminGetAgents();
      setAgents(rows as Record<string, unknown>[]);
    } catch {
      showToast("Could not load agents.", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSellers = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await adminGetSellers();
      setSellers(rows as Record<string, unknown>[]);
    } catch {
      showToast("Could not load sellers.", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadVisits = useCallback(async () => {
    setLoading(true);
    try {
      const raw = await adminGetVisits({ page: visitPage, size: visitSize });
      setVisitRows((raw.content as Record<string, unknown>[]) ?? []);
      setVisitTotal(Number(raw.total ?? 0));
    } catch {
      showToast("Could not load visits.", "error");
    } finally {
      setLoading(false);
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
      setLoading(true);
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
      setLoading(false);
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
      setLoading(true);
      await adminCreateSeller({
        name: sellerName.trim(),
        phone: digitsToIndiaE164(sellerDigits),
        password: sellerPassword,
        preferredAgentId: sellerPreferredAgentId || null,
      });
      showToast("Seller created.", "success");
      setSellerName("");
      setSellerDigits("");
      setSellerPassword("");
      setSellerPreferredAgentId("");
      await loadSellers();
    } catch (err) {
      showToast(
        humanizeAdminCreateError(err, "Could not create seller."),
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  if (!token || String(role).toUpperCase() !== "ADMIN") {
    return null;
  }

  return (
    <AppDashboardChrome variant="admin">
    <div className="min-h-[100dvh] bg-[#FAF8F5] px-4 py-6 pb-12 md:px-8">
      <div className="mx-auto max-w-3xl lg:max-w-4xl">
        <h1 className="text-xl font-extrabold">Admin dashboard</h1>
        <div className="mt-4 flex flex-wrap gap-2 border-b border-[#E8E0D8] pb-2">
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
                  ? "rounded-full bg-[#1A1108] px-4 py-2 text-xs font-semibold text-white"
                  : "rounded-full px-4 py-2 text-xs font-semibold text-[#7B6E62]"
              }
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "listings" ? (
          <div className="mt-4">
            <label className="text-xs font-semibold text-[#7B6E62]">
              Filter status
              <select
                className="mt-1 w-full max-w-xs rounded-lg border bg-white px-3 py-2"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All</option>
                <option value="NEW">NEW</option>
                <option value="PENDING_REVIEW">PENDING_REVIEW</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </label>
            <button
              type="button"
              onClick={() => void loadListings()}
              className="ml-2 mt-6 rounded-lg bg-[#F5EDE4] px-3 py-2 text-xs font-semibold text-[#7D4B1C]"
            >
              Refresh
            </button>
            {loading ? (
              <p className="mt-4 text-sm text-[#7B6E62]">Loading…</p>
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
                      className="rounded-xl bg-white p-3 shadow-sm"
                    >
                      <Link
                        href={`/admin/properties/${encodeURIComponent(id)}`}
                        className="block font-semibold text-[#1A1108] underline"
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
                          className="rounded-lg bg-[#1E8449] px-3 py-1.5 text-xs font-semibold text-white"
                        >
                          Activate
                        </button>
                        <button
                          type="button"
                          onClick={() => void onReject(id)}
                          className="rounded-lg bg-[#922B21] px-3 py-1.5 text-xs font-semibold text-white"
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
          <div className="mt-4">
            <p className="text-xs text-[#7B6E62]">
              All property visit bookings (newest batch on first page).
            </p>
            <button
              type="button"
              onClick={() => void loadVisits()}
              className="mt-2 rounded-lg bg-[#F5EDE4] px-3 py-2 text-xs font-semibold text-[#7D4B1C]"
            >
              Refresh
            </button>
            {loading ? (
              <p className="mt-4 text-sm text-[#7B6E62]">Loading…</p>
            ) : visitRows.length === 0 ? (
              <p className="mt-4 text-sm text-[#7B6E62]">No visits yet.</p>
            ) : (
              <>
                <ul className="mt-4 space-y-2">
                  {visitRows.map((row) => {
                    const id = String(row.id ?? "");
                    const title = String(
                      row.propertyTitle ?? row.property_title ?? "—"
                    );
                    const phone = String(
                      row.buyerPhone ?? row.buyer_phone ?? "—"
                    );
                    const d = String(row.visitDate ?? row.visit_date ?? "");
                    const t = String(row.visitTime ?? row.visit_time ?? "");
                    const st = String(row.status ?? "");
                    return (
                      <li
                        key={id}
                        className="rounded-xl bg-white p-3 text-sm shadow-sm"
                      >
                        <p className="font-semibold text-[#1A1108]">{title}</p>
                        <p className="text-xs text-[#7B6E62]">
                          {d} · {t} · {phone}
                        </p>
                        <p className="mt-1 text-[10px] font-bold uppercase text-[#7D4B1C]">
                          {st.replace(/_/g, " ")}
                        </p>
                      </li>
                    );
                  })}
                </ul>
                <div className="mt-4 flex items-center gap-2 text-xs text-[#7B6E62]">
                  <button
                    type="button"
                    disabled={visitPage <= 0}
                    onClick={() => setVisitPage((p) => Math.max(0, p - 1))}
                    className="rounded-lg border border-[#E8E0D8] px-3 py-1.5 font-semibold disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <span>
                    Page {visitPage + 1} · {visitTotal} total
                  </span>
                  <button
                    type="button"
                    disabled={(visitPage + 1) * visitSize >= visitTotal}
                    onClick={() => setVisitPage((p) => p + 1)}
                    className="rounded-lg border border-[#E8E0D8] px-3 py-1.5 font-semibold disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </>
            )}
          </div>
        ) : null}

        {tab === "sellers" ? (
          <div className="mt-4 space-y-6">
            <form
              className="rounded-xl bg-white p-4 shadow-sm"
              onSubmit={(e) => void onCreateSeller(e)}
            >
              <h2 className="font-extrabold">Create seller</h2>
              <input
                required
                placeholder="Name"
                className="mb-2 mt-2 w-full rounded-lg border px-3 py-2"
                value={sellerName}
                onChange={(e) => setSellerName(e.target.value)}
              />
              <label className="mb-2 block text-xs font-semibold text-[#7B6E62]">
                Assign agent (optional)
                <select
                  className="mt-1 w-full rounded-lg border bg-white px-3 py-2"
                  value={sellerPreferredAgentId}
                  onChange={(e) => setSellerPreferredAgentId(e.target.value)}
                >
                  <option value="">No agent</option>
                  {agents.map((a) => (
                    <option key={String(a.id)} value={String(a.id)}>
                      {String(a.name ?? "")}
                    </option>
                  ))}
                </select>
              </label>
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
                className="mb-2 w-full rounded-lg border px-3 py-2"
                value={sellerPassword}
                onChange={(e) => setSellerPassword(e.target.value)}
              />
              <button
                type="submit"
                className="w-full rounded-xl bg-[#7D4B1C] py-3 font-semibold text-white"
              >
                Create
              </button>
            </form>
            <ul className="space-y-2">
              {sellers.map((s) => (
                <li
                  key={String(s.id)}
                  className="rounded-lg bg-white p-3 text-sm shadow-sm"
                >
                  {String(s.name ?? "")} · {String(s.phone ?? "")}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <button
          type="button"
          className="mt-10 text-sm font-semibold text-[#7B6E62] underline"
          onClick={() => {
            logout();
            router.replace("/admin/login");
          }}
        >
          Log out
        </button>
      </div>
    </div>
    </AppDashboardChrome>
  );
}
