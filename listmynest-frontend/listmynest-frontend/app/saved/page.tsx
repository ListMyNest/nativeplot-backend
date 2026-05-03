"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import {
  getSavedListings,
  removeSaved,
  sendBuyerOtp,
  verifyBuyerOtp,
} from "../../lib/api";
import { useAuthStore } from "../../lib/store";
import { showToast } from "../../lib/toast";
import { PropertyRemoteImage } from "../../components/property/PropertyRemoteImage";
import { formatPriceRangeLakh } from "../../lib/utils/formatPrice";
import { Skeleton } from "../../components/ui/Skeleton";
import { Button } from "../../components/ui/Button";

function normalizeSaved(row: Record<string, unknown>) {
  return {
    id: String(row.id ?? ""),
    propertyId: String(row.propertyId ?? row.property_id ?? ""),
    title: String(row.propertyTitle ?? row.property_title ?? "Listing"),
    city: String(row.propertyCity ?? row.property_city ?? ""),
    status: String(row.propertyStatus ?? row.property_status ?? ""),
    priceMin: Number(row.priceMin ?? row.price_min ?? 0),
    priceMax: Number(row.priceMax ?? row.price_max ?? 0),
    photo: (row.primaryPhoto ?? row.primary_photo) as string | null,
    savedAt: String(row.savedAt ?? row.saved_at ?? ""),
  };
}

export default function SavedPage() {
  const buyerToken = useAuthStore((s) => s.buyerToken);
  const setBuyer = useAuthStore((s) => s.setBuyer);
  const hydrateFromStorage = useAuthStore((s) => s.hydrateFromStorage);

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<ReturnType<typeof normalizeSaved>[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    hydrateFromStorage();
  }, [hydrateFromStorage]);

  const load = useCallback(async () => {
    if (!buyerToken) return;
    setLoading(true);
    try {
      const raw = await getSavedListings();
      const arr = (Array.isArray(raw) ? raw : []).map((x) =>
        normalizeSaved(x as Record<string, unknown>)
      );
      setItems(arr);
    } catch {
      showToast("Could not load saved listings.", "error");
    } finally {
      setLoading(false);
    }
  }, [buyerToken]);

  useEffect(() => {
    if (buyerToken) void load();
  }, [buyerToken, load]);

  const onSendOtp = async () => {
    const p = phone.trim();
    if (!p) return;
    setBusy(true);
    try {
      await sendBuyerOtp(p);
      setStep("otp");
      showToast("OTP sent.", "success");
    } catch (e) {
      showToast(
        e instanceof Error ? e.message : "Could not send OTP.",
        "error"
      );
    } finally {
      setBusy(false);
    }
  };

  const onVerify = async () => {
    const p = phone.trim();
    setBusy(true);
    try {
      const { buyerToken: bt, buyerId } = await verifyBuyerOtp(p, otp.trim());
      setBuyer(bt, buyerId);
      showToast("Verified.", "success");
    } catch (e) {
      showToast(
        e instanceof Error ? e.message : "Invalid OTP.",
        "error"
      );
    } finally {
      setBusy(false);
    }
  };

  const onRemove = async (propertyId: string) => {
    try {
      await removeSaved(propertyId);
      showToast("Removed.", "success");
      await load();
    } catch (e) {
      showToast(
        e instanceof Error ? e.message : "Could not remove.",
        "error"
      );
    }
  };

  if (!buyerToken) {
    return (
      <main className="mx-auto min-h-[100dvh] max-w-md bg-bg px-4 py-8">
        <Link href="/" className="text-sm font-semibold text-lmn-primary">
          ← Home
        </Link>
        <h1 className="lmn-h1 mt-6 text-text">Saved listings</h1>
        <p className="mt-2 text-sm text-muted">
          Verify your phone to see saved listings.
        </p>
        <div className="mt-6 space-y-3">
          {step === "phone" ? (
            <>
              <input
                className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-text shadow-sm outline-none focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-2 focus:ring-offset-bg"
                placeholder="+91 …"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <Button fullWidth loading={busy} onClick={() => void onSendOtp()}>
                Send OTP
              </Button>
            </>
          ) : (
            <>
              <input
                className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-text shadow-sm outline-none focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-2 focus:ring-offset-bg"
                placeholder="OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
              />
              <Button
                fullWidth
                loading={busy}
                variant="secondary"
                onClick={() => void onVerify()}
              >
                Verify
              </Button>
            </>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-[100dvh] max-w-md bg-bg px-4 py-8 pb-24">
      <Link href="/" className="text-sm font-semibold text-lmn-primary">
        ← Home
      </Link>
      <h1 className="lmn-h1 mt-6 text-text">Saved</h1>
      {loading ? (
        <ul className="mt-4 space-y-4">
          {[1, 2, 3].map((k) => (
            <li key={k} className="rounded-3xl border-2 border-border bg-surface p-3 shadow-md">
              <div className="flex gap-3">
                <Skeleton className="size-20 shrink-0 rounded-2xl" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="h-4 w-2/5" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : items.length === 0 ? (
        <p className="mt-4 text-sm text-muted">No saved listings yet.</p>
      ) : (
        <ul className="mt-4 space-y-4">
          {items.map((s) => (
            <li
              key={s.id}
              className="overflow-hidden rounded-3xl border-2 border-border bg-surface shadow-md"
            >
              <Link
                href={`/property/${encodeURIComponent(s.propertyId)}`}
                className="flex gap-3 p-3"
              >
                <div className="relative size-20 shrink-0 overflow-hidden rounded-2xl bg-surface2">
                  {s.photo ? (
                    <PropertyRemoteImage
                      src={s.photo}
                      alt=""
                      fill
                      sizes="80px"
                      className="size-full"
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-extrabold text-text">
                    {s.title}
                  </p>
                  <p className="text-sm font-extrabold text-lmn-primary">
                    {formatPriceRangeLakh(s.priceMin, s.priceMax)}
                  </p>
                  <p className="text-xs text-muted">{s.city}</p>
                  <span className="mt-1 inline-block rounded-full bg-surface2 px-2 py-0.5 text-[10px] font-bold text-text ring-1 ring-border">
                    {s.status}
                  </span>
                </div>
              </Link>
              <div className="border-t border-border px-3 py-2">
                <button
                  type="button"
                  onClick={() => void onRemove(s.propertyId)}
                  className="text-xs font-semibold text-danger"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
