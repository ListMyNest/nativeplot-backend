"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  adminActivateListing,
  adminGetPropertyDetail,
  adminRejectListing,
} from "../../../../lib/api";
import { useAuthStore } from "../../../../lib/store";
import { showToast } from "../../../../lib/toast";
import { AppDashboardChrome } from "../../../../components/layout/AppDashboardChrome";
import { PropertyRemoteImage } from "../../../../components/property/PropertyRemoteImage";

function pickProperty(raw: Record<string, unknown>) {
  const p =
    (raw.property as Record<string, unknown> | undefined) ??
    (raw as Record<string, unknown>);
  return {
    id: String(p.id ?? ""),
    title: String(p.title ?? ""),
    city: String(p.city ?? ""),
    locality: String(p.locality ?? ""),
    status: String(p.status ?? ""),
    verified: Boolean(p.verified),
    description: String(p.description ?? ""),
    priceMin: Number(p.priceMin ?? p.price_min ?? 0),
    priceMax: Number(p.priceMax ?? p.price_max ?? 0),
    photos: Array.isArray(p.photos) ? (p.photos as Record<string, unknown>[]) : [],
  };
}

export default function AdminPropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const token = useAuthStore((s) => s.token);
  const role = useAuthStore((s) => s.role);

  const [raw, setRaw] = useState<Record<string, unknown> | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token || String(role).toUpperCase() !== "ADMIN") return;
    let cancelled = false;
    void (async () => {
      try {
        const r = await adminGetPropertyDetail(String(id));
        if (!cancelled) setRaw(r as Record<string, unknown>);
      } catch (e) {
        showToast(e instanceof Error ? e.message : "Could not load.", "error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, token, role]);

  const p = useMemo(() => (raw ? pickProperty(raw) : null), [raw]);

  const onActivate = async () => {
    if (!p?.id) return;
    setBusy(true);
    try {
      await adminActivateListing(p.id);
      showToast("Activated.", "success");
      const r = await adminGetPropertyDetail(p.id);
      setRaw(r as Record<string, unknown>);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Could not update.", "error");
    } finally {
      setBusy(false);
    }
  };

  const onInactivate = async () => {
    if (!p?.id) return;
    setBusy(true);
    try {
      await adminRejectListing(p.id);
      showToast("Updated.", "success");
      const r = await adminGetPropertyDetail(p.id);
      setRaw(r as Record<string, unknown>);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Could not update.", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppDashboardChrome variant="admin">
      <div className="min-h-[100dvh] bg-[#FAF8F5] px-4 py-6 pb-12 md:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-xl font-extrabold text-[#1A1108]">
              Property detail
            </h1>
            <Link
              href="/admin/dashboard"
              className="text-sm font-semibold text-[#7D4B1C]"
            >
              Back
            </Link>
          </div>

          {!p ? (
            <div className="mt-6 h-28 animate-pulse rounded-2xl bg-white" />
          ) : (
            <>
              <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
                <p className="text-sm font-bold text-[#1A1108]">{p.title}</p>
                <p className="mt-1 text-xs text-[#7B6E62]">
                  {p.city} · {p.locality}
                </p>
                <p className="mt-2 text-xs font-semibold text-[#7B6E62]">
                  Status:{" "}
                  <span className="font-bold text-[#1A1108]">
                    {p.status}
                  </span>{" "}
                  · Verified:{" "}
                  <span className="font-bold text-[#1A1108]">
                    {String(p.verified)}
                  </span>
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void onActivate()}
                    className="rounded-lg bg-[#1E8449] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    Activate
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void onInactivate()}
                    className="rounded-lg bg-[#922B21] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    Inactivate
                  </button>
                </div>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl bg-white p-3 shadow-sm">
                  <p className="mb-2 text-xs font-bold text-[#7B6E62]">
                    Photos
                  </p>
                  {p.photos.length === 0 ? (
                    <p className="text-sm text-[#7B6E62]">No photos.</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {p.photos.map((ph) => {
                        const url = String(ph.url ?? "");
                        if (!url) return null;
                        return (
                          <div
                            key={String(ph.id ?? url)}
                            className="relative aspect-video overflow-hidden rounded-xl bg-gray-200"
                          >
                            <PropertyRemoteImage
                              src={url}
                              alt=""
                              fill
                              sizes="(max-width: 1024px) 100vw, 50vw"
                              className="size-full"
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl bg-white p-4 shadow-sm">
                  <p className="text-xs font-bold text-[#7B6E62]">
                    Description
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-[#1A1108]">
                    {p.description || "—"}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </AppDashboardChrome>
  );
}

