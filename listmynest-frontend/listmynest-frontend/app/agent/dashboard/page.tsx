"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { AppDashboardChrome } from "../../../components/layout/AppDashboardChrome";
import {
  getAgentDashboard,
  getAgentLeads,
  getAgentVisits,
  rescheduleVisit,
  updateVisitStatus,
} from "../../../lib/api";
import { useAuthStore } from "../../../lib/store";
import { showToast } from "../../../lib/toast";

function num(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string" && v) {
    const n = Number(v);
    return Number.isNaN(n) ? 0 : n;
  }
  return 0;
}

function waMeFromPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const d = phone.replace(/\D/g, "");
  const tail = d.length >= 10 ? d.slice(-10) : d;
  if (tail.length < 10) return null;
  return `https://wa.me/91${tail}`;
}

function formatLead(
  r: Record<string, unknown>
): {
  id: string;
  propertyTitle: string;
  actionType: string;
  createdAt: string;
  buyerPhone: string | null;
} {
  return {
    id: String(r.id ?? ""),
    propertyTitle: String(
      r.propertyTitle ?? r.property_title ?? "Property"
    ),
    actionType: String(r.actionType ?? r.action_type ?? ""),
    createdAt: String(r.createdAt ?? r.created_at ?? ""),
    buyerPhone: r.buyerPhone
      ? String(r.buyerPhone)
      : r.buyer_phone
        ? String(r.buyer_phone)
        : null,
  };
}

function formatVisit(r: Record<string, unknown>): {
  id: string;
  buyerPhone: string;
  propertyTitle: string;
  visitDate: string;
  visitTime: string;
  status: string;
} {
  return {
    id: String(r.id ?? ""),
    buyerPhone: String(r.buyerPhone ?? r.buyer_phone ?? ""),
    propertyTitle: String(
      r.propertyTitle ?? r.property_title ?? "Property"
    ),
    visitDate: String(r.visitDate ?? r.visit_date ?? ""),
    visitTime: String(r.visitTime ?? r.visit_time ?? ""),
    status: String(r.status ?? ""),
  };
}

export default function AgentDashboardPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const role = useAuthStore((s) => s.role);
  const logout = useAuthStore((s) => s.logout);
  const hydrateFromStorage = useAuthStore((s) => s.hydrateFromStorage);

  const [dash, setDash] = useState<Record<string, unknown> | null>(null);
  const [leads, setLeads] = useState<ReturnType<typeof formatLead>[]>([]);
  const [visits, setVisits] = useState<ReturnType<typeof formatVisit>[]>([]);
  const [loading, setLoading] = useState(true);
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [rDate, setRDate] = useState("");
  const [rTime, setRTime] = useState("10:00:00");

  useEffect(() => {
    hydrateFromStorage();
  }, [hydrateFromStorage]);

  useEffect(() => {
    if (!token || String(role).toUpperCase() !== "AGENT") {
      router.replace("/agent/login");
    }
  }, [token, role, router]);

  const today = new Date().toISOString().slice(0, 10);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [d, rawLeads, rawVisits] = await Promise.all([
        getAgentDashboard(),
        getAgentLeads(),
        getAgentVisits(today),
      ]);
      setDash(d);
      const la = (Array.isArray(rawLeads) ? rawLeads : []).map((x) =>
        formatLead(x as Record<string, unknown>)
      );
      setLeads(la);
      const va = (Array.isArray(rawVisits) ? rawVisits : []).map((x) =>
        formatVisit(x as Record<string, unknown>)
      );
      setVisits(va);
    } catch {
      showToast("Could not load dashboard.", "error");
    } finally {
      setLoading(false);
    }
  }, [token, today]);

  useEffect(() => {
    if (token && String(role).toUpperCase() === "AGENT") void load();
  }, [token, role, load]);

  const markVisited = async (id: string, status: string) => {
    try {
      await updateVisitStatus(id, status);
      showToast("Updated.", "success");
      await load();
    } catch (e) {
      showToast(
        e instanceof Error ? e.message : "Could not update.",
        "error"
      );
    }
  };

  const doReschedule = async () => {
    if (!rescheduleId || !rDate || !rTime) return;
    try {
      await rescheduleVisit(rescheduleId, rDate, rTime);
      showToast("Rescheduled.", "success");
      setRescheduleId(null);
      await load();
    } catch (e) {
      showToast(
        e instanceof Error ? e.message : "Could not reschedule.",
        "error"
      );
    }
  };

  if (!token || String(role).toUpperCase() !== "AGENT") {
    return null;
  }

  return (
    <AppDashboardChrome variant="agent">
      <div className="min-h-[100dvh] bg-bg px-4 py-6 pb-12 md:px-8">
      <div className="mx-auto max-w-lg lg:max-w-4xl">
        <h1 className="font-heading text-xl font-extrabold text-text">Agent</h1>
        <p className="text-sm text-muted">Today · {today}</p>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ["New leads", num(dash?.newLeads ?? dash?.new_leads)],
            ["Today visits", num(dash?.todayVisits ?? dash?.today_visits)],
            ["Visits done", num(dash?.totalVisitsDone ?? dash?.total_visits_done)],
            ["WA leads", num(dash?.waLeads ?? dash?.wa_leads)],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-2xl border-2 border-border bg-surface p-3 shadow-md"
            >
              <p className="text-lg font-extrabold tabular-nums text-text">{value}</p>
              <p className="text-[10px] font-medium text-muted">{label}</p>
            </div>
          ))}
        </div>

        <h2 className="font-heading mt-8 text-lg font-extrabold text-text">
          Today&apos;s visits
        </h2>
        {loading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : visits.length === 0 ? (
          <p className="text-sm text-muted">No visits today.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {visits.map((v) => (
              <li
                key={v.id}
                className="rounded-2xl border-2 border-border bg-surface p-4 shadow-md"
              >
                <p className="text-sm font-bold text-text">
                  {v.propertyTitle}
                </p>
                <p className="text-xs text-muted">
                  {v.buyerPhone} · {v.visitDate} {v.visitTime} · {v.status}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void markVisited(v.id, "VISITED")}
                    className="rounded-xl bg-success px-3 py-2 text-xs font-semibold text-white shadow-sm transition-[transform,box-shadow] duration-fast hover:shadow-md active:scale-[0.98]"
                  >
                    Mark visited
                  </button>
                  <button
                    type="button"
                    onClick={() => void markVisited(v.id, "NOT_VISITED")}
                    className="rounded-xl bg-danger px-3 py-2 text-xs font-semibold text-white shadow-sm transition-[transform,box-shadow] duration-fast hover:shadow-md active:scale-[0.98]"
                  >
                    Not visited
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRescheduleId(v.id);
                      setRDate(today);
                    }}
                    className="rounded-lg bg-[#F5EDE4] px-3 py-1.5 text-xs font-semibold text-[#7D4B1C]"
                  >
                    Reschedule
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <h2 className="mt-8 text-lg font-extrabold">Leads</h2>
        {loading ? null : leads.length === 0 ? (
          <p className="text-sm text-[#7B6E62]">No leads.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {leads.map((l) => {
              const wa = waMeFromPhone(l.buyerPhone);
              return (
                <li
                  key={l.id}
                  className="rounded-2xl bg-white p-3 shadow-sm"
                >
                  <p className="text-sm font-bold">{l.propertyTitle}</p>
                  <p className="text-xs text-[#7B6E62]">
                    {l.actionType} · {l.createdAt}
                  </p>
                  {wa ? (
                    <a
                      href={wa}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block rounded-lg bg-[#25D366] px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      WhatsApp
                    </a>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}

        <button
          type="button"
          className="mt-8 text-sm font-semibold text-[#7B6E62] underline"
          onClick={() => {
            logout();
            router.replace("/agent/login");
          }}
        >
          Log out
        </button>
      </div>

      {rescheduleId ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-t-2xl bg-white p-4">
            <h3 className="font-extrabold">Reschedule</h3>
            <label className="mt-3 block text-xs text-[#7B6E62]">
              Date
              <input
                type="date"
                className="mt-1 w-full rounded-lg border px-3 py-2"
                value={rDate}
                onChange={(e) => setRDate(e.target.value)}
              />
            </label>
            <label className="mt-2 block text-xs text-[#7B6E62]">
              Time
              <input
                type="time"
                className="mt-1 w-full rounded-lg border px-3 py-2"
                value={rTime.slice(0, 5)}
                onChange={(e) => setRTime(`${e.target.value}:00`)}
              />
            </label>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => void doReschedule()}
                className="flex-1 rounded-xl bg-[#C0392B] py-3 font-semibold text-white"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setRescheduleId(null)}
                className="flex-1 rounded-xl bg-[#F5EDE4] py-3 font-semibold text-[#7D4B1C]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
    </AppDashboardChrome>
  );
}
