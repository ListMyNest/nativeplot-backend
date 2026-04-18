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
      <main className="mx-auto min-h-[100dvh] max-w-md bg-[#FAF8F5] px-4 py-8">
        <Link href="/" className="text-sm font-semibold text-[#C0392B]">
          ← Home
        </Link>
        <h1 className="mt-6 text-xl font-extrabold">Saved listings</h1>
        <p className="mt-2 text-sm text-[#7B6E62]">
          Verify your phone to see saved listings.
        </p>
        <div className="mt-6 space-y-3">
          {step === "phone" ? (
            <>
              <input
                className="w-full rounded-xl border border-[#E8E0D8] bg-white px-4 py-3"
                placeholder="+91 …"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <button
                type="button"
                disabled={busy}
                onClick={() => void onSendOtp()}
                className="w-full rounded-xl bg-[#C0392B] py-3 font-semibold text-white"
              >
                Send OTP
              </button>
            </>
          ) : (
            <>
              <input
                className="w-full rounded-xl border border-[#E8E0D8] bg-white px-4 py-3"
                placeholder="OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
              />
              <button
                type="button"
                disabled={busy}
                onClick={() => void onVerify()}
                className="w-full rounded-xl bg-[#7D4B1C] py-3 font-semibold text-white"
              >
                Verify
              </button>
            </>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-[100dvh] max-w-md bg-[#FAF8F5] px-4 py-8 pb-24">
      <Link href="/" className="text-sm font-semibold text-[#C0392B]">
        ← Home
      </Link>
      <h1 className="mt-6 text-xl font-extrabold">Saved</h1>
      {loading ? (
        <p className="mt-4 text-sm text-[#7B6E62]">Loading…</p>
      ) : items.length === 0 ? (
        <p className="mt-4 text-sm text-[#7B6E62]">No saved listings yet.</p>
      ) : (
        <ul className="mt-4 space-y-4">
          {items.map((s) => (
            <li
              key={s.id}
              className="overflow-hidden rounded-2xl bg-white shadow-sm"
            >
              <Link
                href={`/property/${encodeURIComponent(s.propertyId)}`}
                className="flex gap-3 p-3"
              >
                <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-[#F5EDE4]">
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
                  <p className="line-clamp-2 text-sm font-bold text-[#1A1108]">
                    {s.title}
                  </p>
                  <p className="text-sm font-extrabold text-[#C0392B]">
                    {formatPriceRangeLakh(s.priceMin, s.priceMax)}
                  </p>
                  <p className="text-xs text-[#7B6E62]">{s.city}</p>
                  <span className="mt-1 inline-block rounded-full bg-[#F5EDE4] px-2 py-0.5 text-[10px] font-bold">
                    {s.status}
                  </span>
                </div>
              </Link>
              <div className="border-t border-[#F5EDE4] px-3 py-2">
                <button
                  type="button"
                  onClick={() => void onRemove(s.propertyId)}
                  className="text-xs font-semibold text-[#922B21]"
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
