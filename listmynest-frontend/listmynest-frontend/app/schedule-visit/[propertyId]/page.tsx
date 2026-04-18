"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { PropertyRemoteImage } from "../../../components/property/PropertyRemoteImage";
import { getPropertyDetail, scheduleVisit } from "../../../lib/api";
import { formatPriceRangeLakh } from "../../../lib/utils/formatPrice";
import type { PropertyDetail } from "../../../types";

const TIME_SLOTS = [
  { label: "10:00 AM", value: "10:00:00" },
  { label: "11:00 AM", value: "11:00:00" },
  { label: "12:00 PM", value: "12:00:00" },
  { label: "2:00 PM", value: "14:00:00" },
  { label: "3:00 PM", value: "15:00:00" },
  { label: "4:00 PM", value: "16:00:00" },
] as const;

function formatLocalYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function nextSevenDays(): { ymd: string; dow: string; dayNum: number }[] {
  const out: { ymd: string; dow: string; dayNum: number }[] = [];
  const dowFmt = new Intl.DateTimeFormat("en-IN", { weekday: "short" });
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + i);
    out.push({
      ymd: formatLocalYmd(d),
      dow: dowFmt.format(d).replace(/\.$/, ""),
      dayNum: d.getDate(),
    });
  }
  return out;
}

function normalizeBuyerPhone(input: string): string {
  const s = input.trim().replace(/\s/g, "");
  if (!s) return "";
  if (s.startsWith("+")) return s;
  const digits = s.replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length >= 11) return `+${digits}`;
  return s;
}

function callTelFromEnv(): string | null {
  const raw = process.env.NEXT_PUBLIC_ENQUIRY_PHONE?.trim();
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (raw.startsWith("+")) return `tel:${raw.replace(/\s/g, "")}`;
  if (digits.length > 0) return `tel:+${digits}`;
  return null;
}

export default function ScheduleVisitPage() {
  const params = useParams();
  const router = useRouter();
  const propertyId = decodeURIComponent(String(params.propertyId ?? ""));

  const [property, setProperty] = useState<PropertyDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const days = useMemo(() => nextSevenDays(), []);
  const [selectedYmd, setSelectedYmd] = useState(() => days[0]?.ymd ?? "");
  const [selectedTime, setSelectedTime] = useState<string>(TIME_SLOTS[0]!.value);
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!propertyId) return;
    let cancelled = false;
    (async () => {
      try {
        const p = await getPropertyDetail(propertyId);
        if (!cancelled) {
          setProperty(p);
          setLoadError(null);
        }
      } catch {
        if (!cancelled) {
          setProperty(null);
          setLoadError("We couldn’t load this listing.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [propertyId]);

  const onConfirm = useCallback(async () => {
    setFormError(null);
    const buyer_phone = normalizeBuyerPhone(phone);
    if (!buyer_phone || buyer_phone.length < 10) {
      setFormError("Please enter a valid phone number.");
      return;
    }
    if (!selectedYmd || !selectedTime) {
      setFormError("Please choose a date and time.");
      return;
    }
    setSubmitting(true);
    try {
      await scheduleVisit({
        propertyId,
        visitDate: selectedYmd,
        visitTime: selectedTime,
        buyerPhone: buyer_phone,
      });
      window.alert("Your visit request has been sent. The agent will call you to confirm.");
      router.push(`/property/${encodeURIComponent(propertyId)}`);
    } catch {
      setFormError("Could not schedule the visit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [phone, propertyId, router, selectedTime, selectedYmd]);

  const telHref = callTelFromEnv();
  const priceLine = property
    ? formatPriceRangeLakh(property.price_min, property.price_max)
    : "";
  const displayId = property?.property_code?.trim() || property?.id || "—";

  return (
    <div className="min-h-[100dvh] bg-[#FAF8F5] pb-8">
      <header className="sticky top-14 z-20 flex items-center gap-2 border-b border-[#E8E0D8] bg-white px-4 py-3 sm:top-[3.75rem] sm:px-6">
        <Link
          href={propertyId ? `/property/${encodeURIComponent(propertyId)}` : "/"}
          className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-[#F5EDE4] text-lg leading-none text-[#7D4B1C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C0392B] focus-visible:ring-offset-2"
          aria-label="Back"
        >
          ←
        </Link>
        <h1 className="text-base font-extrabold text-[#1A1108]">
          Schedule a Visit
        </h1>
      </header>

      <div className="mx-auto w-full max-w-lg space-y-6 px-4 pt-4 sm:px-6 md:max-w-2xl md:px-8">
        {loadError ? (
          <p className="rounded-2xl bg-[#F9EBEA] px-4 py-3 text-sm text-[#922B21]">
            {loadError}
          </p>
        ) : null}

        {property ? (
          <div className="flex gap-3 rounded-2xl bg-[#F5EDE4] p-3">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[linear-gradient(145deg,#F5EDE4_0%,#FEF3DC_55%,#E8E0D8_100%)]">
              {property.primary_photo ? (
                <PropertyRemoteImage
                  src={property.primary_photo}
                  alt=""
                  fill
                  sizes="64px"
                  className="size-full"
                />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-sm font-semibold leading-snug text-[#1A1108]">
                {property.title}
              </p>
              <p className="mt-0.5 text-[11px] font-medium text-[#7B6E62]">
                ID: {displayId}
              </p>
              <p className="mt-1 text-sm font-extrabold text-[#C0392B]">
                {priceLine}
              </p>
            </div>
          </div>
        ) : !loadError ? (
          <div className="h-24 animate-pulse rounded-2xl bg-[#E8E0D8]" />
        ) : null}

        <section aria-labelledby="select-date-label">
          <p
            id="select-date-label"
            className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#7B6E62]"
          >
            SELECT DATE
          </p>
          <div className="-mx-1 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {days.map(({ ymd, dow, dayNum }) => {
              const active = selectedYmd === ymd;
              return (
                <button
                  key={ymd}
                  type="button"
                  onClick={() => setSelectedYmd(ymd)}
                  className={
                    active
                      ? "flex h-[72px] w-[50px] shrink-0 flex-col items-center justify-center rounded-xl bg-[#C0392B] text-white shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C0392B] focus-visible:ring-offset-2"
                      : "flex h-[72px] w-[50px] shrink-0 flex-col items-center justify-center rounded-xl border border-[#E8E0D8] bg-white text-[#1A1108] shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C0392B] focus-visible:ring-offset-2"
                  }
                >
                  <span className="text-[11px] font-semibold capitalize">
                    {dow}
                  </span>
                  <span className="text-lg font-extrabold leading-none">
                    {dayNum}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="select-time-label">
          <p
            id="select-time-label"
            className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#7B6E62]"
          >
            SELECT TIME
          </p>
          <div className="grid grid-cols-3 gap-2">
            {TIME_SLOTS.map(({ label, value }) => {
              const active = selectedTime === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSelectedTime(value)}
                  className={
                    active
                      ? "rounded-xl bg-[#C0392B] py-3 text-center text-xs font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C0392B] focus-visible:ring-offset-2"
                      : "rounded-xl border border-[#E8E0D8] bg-white py-3 text-center text-xs font-semibold text-[#1A1108] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C0392B] focus-visible:ring-offset-2"
                  }
                >
                  {label}
                </button>
              );
            })}
          </div>
        </section>

        <div>
          <label
            htmlFor="buyer-phone"
            className="mb-1.5 block text-xs font-semibold text-[#7B6E62]"
          >
            Your number — Agent will call 1 hour before to confirm
          </label>
          <input
            id="buyer-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+91 98765 43210"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-xl border border-[#E8E0D8] bg-white px-4 py-3.5 text-[15px] text-[#1A1108] outline-none ring-0 placeholder:text-[#B0A499] focus:border-[#C0392B] focus:ring-2 focus:ring-[#C0392B]/25"
          />
        </div>

        {formError ? (
          <p className="text-sm font-medium text-[#C0392B]" role="alert">
            {formError}
          </p>
        ) : null}

        <button
          type="button"
          disabled={submitting || !property}
          onClick={() => void onConfirm()}
          className="flex h-[52px] w-full items-center justify-center rounded-xl bg-[#C0392B] text-base font-extrabold text-white shadow-sm disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C0392B] focus-visible:ring-offset-2"
        >
          {submitting ? "Sending…" : "Confirm Visit"}
        </button>

        <div className="flex items-center gap-3 py-1">
          <div className="h-px flex-1 bg-[#E8E0D8]" />
          <span className="text-[11px] font-semibold uppercase tracking-widest text-[#B0A499]">
            Or
          </span>
          <div className="h-px flex-1 bg-[#E8E0D8]" />
        </div>

        {telHref ? (
          <a
            href={telHref}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-white bg-white text-sm font-semibold text-[#1A1108] shadow-[inset_0_0_0_1px_#E8E0D8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C0392B] focus-visible:ring-offset-2"
          >
            <span aria-hidden>📞</span>
            Call Instead
          </a>
        ) : (
          <span className="flex h-12 w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border-2 border-white bg-white text-sm font-semibold text-[#B0A499] shadow-[inset_0_0_0_1px_#E8E0D8]">
            <span aria-hidden>📞</span>
            Call Instead
          </span>
        )}
      </div>
    </div>
  );
}
