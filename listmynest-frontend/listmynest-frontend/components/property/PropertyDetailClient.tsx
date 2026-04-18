"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { PropertyRemoteImage } from "./PropertyRemoteImage";
import { PhoneDigitsField } from "../ui/PhoneDigitsField";
import {
  ApiError,
  getApiErrorMessage,
  getPropertyDetail,
  getWhatsAppLink,
  logLead,
  recordPropertyView,
  registerNotifyMe,
  saveProperty,
  scheduleVisit,
  sendBuyerOtp,
  verifyBuyerOtp,
} from "../../lib/api";
import { ensureSessionHash } from "../../lib/session";
import { useAuthStore } from "../../lib/store";
import { showToast } from "../../lib/toast";
import { useSessionStore } from "../../store/sessionStore";
import { digitsToIndiaE164, isTenIndiaDigits } from "../../lib/phone";
import { formatPriceRangeLakh } from "../../lib/utils/formatPrice";
import type { PropertyDetail } from "../../types";

function telHref(e164: string): string {
  const t = e164.trim();
  if (!t) return "";
  if (t.startsWith("tel:")) return t;
  return `tel:${t.replace(/\s/g, "")}`;
}

function openStreetMapEmbedUrl(lat: number, lng: number): string {
  const pad = 0.012;
  const minLon = lng - pad;
  const minLat = lat - pad;
  const maxLon = lng + pad;
  const maxLat = lat + pad;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${minLon}%2C${minLat}%2C${maxLon}%2C${maxLat}&layer=mapnik&marker=${lat}%2C${lng}`;
}

const TIME_SLOTS = [
  { label: "9 AM", value: "09:00:00" },
  { label: "10 AM", value: "10:00:00" },
  { label: "11 AM", value: "11:00:00" },
  { label: "12 PM", value: "12:00:00" },
  { label: "2 PM", value: "14:00:00" },
  { label: "4 PM", value: "16:00:00" },
] as const;

/** Visit dates must align with server validation (Asia/Kolkata), not the browser's local calendar. */
const VISIT_DATE_TZ = "Asia/Kolkata";

function nextSevenDays(): { ymd: string; dow: string; dayNum: number }[] {
  const out: { ymd: string; dow: string; dayNum: number }[] = [];
  const ymdFmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: VISIT_DATE_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const dowFmt = new Intl.DateTimeFormat("en-IN", {
    timeZone: VISIT_DATE_TZ,
    weekday: "short",
  });
  const dayNumFmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: VISIT_DATE_TZ,
    day: "numeric",
  });
  for (let i = 0; i < 7; i++) {
    const d = new Date(Date.now() + i * 86400000);
    out.push({
      ymd: ymdFmt.format(d),
      dow: dowFmt.format(d).replace(/\.$/, ""),
      dayNum: parseInt(dayNumFmt.format(d), 10),
    });
  }
  return out;
}

function mapBuyerActionError(e: unknown, fallback: string): string {
  if (!(e instanceof ApiError)) return fallback;
  switch (e.message) {
    case "PROPERTY_NOT_ACTIVE":
      return "This listing is not accepting visit requests yet.";
    case "CONTACT_WHATSAPP_NOT_AVAILABLE":
    case "AGENT_WHATSAPP_NOT_AVAILABLE":
      return "WhatsApp is not available for this listing yet.";
    case "RATE_LIMIT_EXCEEDED":
      return "Too many actions from this session. Please try again later.";
    case "BUYER_PHONE_REQUIRED":
      return "Please enter your mobile number.";
    case "VISIT_DATE_PAST":
      return "Pick today or a future date.";
    case "VISIT_DATE_TOO_FAR":
      return "Visits can only be booked within the next 7 days.";
    case "PROPERTY_NOT_FOUND":
      return "This listing is no longer available.";
    default:
      return e.message || fallback;
  }
}

function typeLabel(type: PropertyDetail["type"]): string {
  const t = String(type).toUpperCase();
  if (t === "PLOT" || t === "PLOTS") return "Plot";
  if (t === "RESIDENTIAL") return "Residential";
  if (t === "COMMERCIAL") return "Commercial";
  if (t === "AGRICULTURAL") return "Agricultural";
  return String(type);
}

type PropertyDetailClientProps = {
  propertyId: string;
};

export function PropertyDetailClient({ propertyId }: PropertyDetailClientProps) {
  const addViewedProperty = useSessionStore((s) => s.addViewedProperty);
  const setContactActionTaken = useSessionStore((s) => s.setContactActionTaken);
  const viewedPropertyIds = useSessionStore((s) => s.viewedPropertyIds);
  const contactActionTaken = useSessionStore((s) => s.contactActionTaken);
  const notifyMeShown = useSessionStore((s) => s.notifyMeShown);
  const setNotifyMeShown = useSessionStore((s) => s.setNotifyMeShown);

  const buyerToken = useAuthStore((s) => s.buyerToken);
  const setBuyer = useAuthStore((s) => s.setBuyer);

  const [property, setProperty] = useState<PropertyDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pendingCall, setPendingCall] = useState(false);
  const [pendingWhatsApp, setPendingWhatsApp] = useState(false);

  const [visitOpen, setVisitOpen] = useState(false);
  const days = nextSevenDays();
  const [selectedYmd, setSelectedYmd] = useState(() => days[0]?.ymd ?? "");
  const [selectedTime, setSelectedTime] = useState<string>(
    TIME_SLOTS[0]!.value
  );
  const [visitDigits, setVisitDigits] = useState("");
  const [visitBusy, setVisitBusy] = useState(false);

  const [saveOpen, setSaveOpen] = useState(false);
  const [saveDigits, setSaveDigits] = useState("");
  const [saveOtp, setSaveOtp] = useState("");
  const [saveStep, setSaveStep] = useState<"phone" | "otp">("phone");
  const [saveBusy, setSaveBusy] = useState(false);

  const [notifyOpen, setNotifyOpen] = useState(false);
  const [notifyDigits, setNotifyDigits] = useState("");
  const [notifyOtp, setNotifyOtp] = useState("");
  const [notifyStep, setNotifyStep] = useState<"phone" | "otp">("phone");
  const [notifyBusy, setNotifyBusy] = useState(false);

  const [geoCoords, setGeoCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [geoStatus, setGeoStatus] = useState<"idle" | "loading" | "miss">(
    "idle"
  );

  useEffect(() => {
    if (!propertyId) return;
    let cancelled = false;
    (async () => {
      try {
        const p = await getPropertyDetail(propertyId);
        if (!cancelled) {
          setProperty(p);
          setLoadError(null);
          document.title = `${p.title} | ListMyNest`;
        }
      } catch (e) {
        if (!cancelled) {
          setProperty(null);
          setLoadError(
            e instanceof ApiError && e.status === 404
              ? "Listing not found."
              : getApiErrorMessage(
                  e,
                  "Could not load this listing. Check that the API is running."
                )
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [propertyId]);

  useEffect(() => {
    if (!property) return;
    addViewedProperty(property.id);
  }, [property, addViewedProperty]);

  useEffect(() => {
    if (!property) return;
    let cancelled = false;
    (async () => {
      const hash = await ensureSessionHash();
      if (cancelled || !hash) return;
      await recordPropertyView(property.id, hash, property.city);
    })();
    return () => {
      cancelled = true;
    };
  }, [property]);

  useEffect(() => {
    if (!property) {
      setGeoCoords(null);
      setGeoStatus("idle");
      return;
    }
    const lat = property.latitude;
    const lng = property.longitude;
    if (
      lat != null &&
      lng != null &&
      Number.isFinite(lat) &&
      Number.isFinite(lng)
    ) {
      setGeoCoords(null);
      setGeoStatus("idle");
      return;
    }
    const q = [property.locality, property.city, "India"]
      .map((x) => (x != null ? String(x).trim() : ""))
      .filter(Boolean)
      .join(", ");
    if (!q) {
      setGeoCoords(null);
      setGeoStatus("miss");
      return;
    }
    let cancelled = false;
    setGeoStatus("loading");
    setGeoCoords(null);
    void fetch(`/api/geocode?q=${encodeURIComponent(q)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { lat?: number | null; lng?: number | null } | null) => {
        if (cancelled || !data) return;
        const glat = data.lat;
        const glng = data.lng;
        if (
          typeof glat === "number" &&
          typeof glng === "number" &&
          Number.isFinite(glat) &&
          Number.isFinite(glng)
        ) {
          setGeoCoords({ lat: glat, lng: glng });
          setGeoStatus("idle");
        } else {
          setGeoStatus("miss");
        }
      })
      .catch(() => {
        if (!cancelled) setGeoStatus("miss");
      });
    return () => {
      cancelled = true;
    };
  }, [
    property?.id,
    property?.locality,
    property?.city,
    property?.latitude,
    property?.longitude,
    property,
  ]);

  useEffect(() => {
    if (
      viewedPropertyIds.length >= 3 &&
      !contactActionTaken &&
      !notifyMeShown
    ) {
      setNotifyOpen(true);
    }
  }, [viewedPropertyIds.length, contactActionTaken, notifyMeShown]);

  const photos =
    property?.photos?.filter((p) => Boolean(p.url)) ?? [];
  const hasPhotos = photos.length > 0;
  const slideCount = hasPhotos ? photos.length : 1;
  const [slideIndex, setSlideIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    setSlideIndex(0);
  }, [propertyId]);

  const goPrev = useCallback(() => {
    setSlideIndex((i) => (i - 1 + slideCount) % slideCount);
  }, [slideCount]);

  const goNext = useCallback(() => {
    setSlideIndex((i) => (i + 1) % slideCount);
  }, [slideCount]);

  const share = useCallback(async () => {
    if (!property) return;
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (navigator.share) {
        await navigator.share({
          title: property.title,
          text: `${property.title} — ListMyNest`,
          url,
        });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        showToast("Link copied.", "success");
      }
    } catch {
      /* user cancelled */
    }
  }, [property]);

  const onCall = async () => {
    if (!property || pendingCall) return;
    const href = property.contact_phone
      ? telHref(property.contact_phone)
      : "";
    if (!href) {
      showToast("Phone number not available for this listing.", "error");
      return;
    }
    setPendingCall(true);
    try {
      const hash = await ensureSessionHash();
      await logLead({
        propertyId: property.id,
        actionType: "CALL",
        sessionHash: hash,
        city: property.city,
      });
      setContactActionTaken(true);
      showToast("Connecting…", "info");
      window.location.href = href;
    } catch (e) {
      showToast(mapBuyerActionError(e, "Could not start call."), "error");
    } finally {
      setPendingCall(false);
    }
  };

  const onWhatsApp = async () => {
    if (!property || pendingWhatsApp) return;
    setPendingWhatsApp(true);
    try {
      const hash = await ensureSessionHash();
      setContactActionTaken(true);
      const { wa_url } = await getWhatsAppLink(property.id, hash);
      if (wa_url) window.open(wa_url, "_blank", "noopener,noreferrer");
      else showToast("WhatsApp link unavailable.", "error");
    } catch (e) {
      showToast(mapBuyerActionError(e, "Could not open WhatsApp."), "error");
    } finally {
      setPendingWhatsApp(false);
    }
  };

  const onConfirmVisit = async () => {
    if (!property) return;
    if (!isTenIndiaDigits(visitDigits)) {
      showToast("Enter your 10-digit mobile number.", "error");
      return;
    }
    const buyerPhone = digitsToIndiaE164(visitDigits);
    setVisitBusy(true);
    try {
      await scheduleVisit({
        propertyId: property.id,
        visitDate: selectedYmd,
        visitTime: selectedTime,
        buyerPhone,
      });
      setContactActionTaken(true);
      showToast(
        "Visit booked. The seller sees it on their dashboard right away.",
        "success"
      );
      setVisitOpen(false);
      setVisitDigits("");
    } catch (e) {
      showToast(
        mapBuyerActionError(e, "Could not schedule visit."),
        "error"
      );
    } finally {
      setVisitBusy(false);
    }
  };

  const onSaveClick = () => {
    if (!property) return;
    if (buyerToken) {
      void (async () => {
        try {
          await saveProperty(property.id);
          showToast("Saved to your list.", "success");
        } catch (e) {
          showToast(
            e instanceof ApiError ? e.message : "Could not save.",
            "error"
          );
        }
      })();
      return;
    }
    setSaveOpen(true);
    setSaveStep("phone");
    setSaveOtp("");
    setSaveDigits("");
  };

  const onSaveSendOtp = async () => {
    if (!isTenIndiaDigits(saveDigits)) {
      showToast("Enter your 10-digit mobile number.", "error");
      return;
    }
    const phone = digitsToIndiaE164(saveDigits);
    setSaveBusy(true);
    try {
      await sendBuyerOtp(phone);
      setSaveStep("otp");
      showToast("OTP sent.", "success");
    } catch (e) {
      showToast(
        e instanceof ApiError ? e.message : "Could not send OTP.",
        "error"
      );
    } finally {
      setSaveBusy(false);
    }
  };

  const onSaveVerify = async () => {
    const phone = digitsToIndiaE164(saveDigits);
    setSaveBusy(true);
    try {
      const { buyerToken: bt, buyerId } = await verifyBuyerOtp(
        phone,
        saveOtp.trim()
      );
      setBuyer(bt, buyerId);
      if (property) await saveProperty(property.id);
      showToast("Saved to your list.", "success");
      setSaveOpen(false);
    } catch (e) {
      showToast(
        e instanceof ApiError ? e.message : "Invalid OTP.",
        "error"
      );
    } finally {
      setSaveBusy(false);
    }
  };

  const onNotifySendOtp = async () => {
    if (!isTenIndiaDigits(notifyDigits)) {
      showToast("Enter your 10-digit mobile number.", "error");
      return;
    }
    const phone = digitsToIndiaE164(notifyDigits);
    setNotifyBusy(true);
    try {
      await sendBuyerOtp(phone);
      setNotifyStep("otp");
      showToast("OTP sent.", "success");
    } catch (e) {
      showToast(
        e instanceof ApiError ? e.message : "Could not send OTP.",
        "error"
      );
    } finally {
      setNotifyBusy(false);
    }
  };

  const onNotifySubmit = async () => {
    if (!property) return;
    const phone = digitsToIndiaE164(notifyDigits);
    setNotifyBusy(true);
    try {
      await verifyBuyerOtp(phone, notifyOtp.trim());
      await registerNotifyMe(phone, property.city);
      setNotifyMeShown(true);
      setNotifyOpen(false);
      showToast("You will be notified of new listings.", "success");
    } catch (e) {
      showToast(
        e instanceof ApiError ? e.message : "Could not register.",
        "error"
      );
    } finally {
      setNotifyBusy(false);
    }
  };

  if (loadError) {
    return (
      <div className="min-h-[100dvh] bg-white px-4 py-10 text-center">
        <p className="text-sm text-lmn-primary">{loadError}</p>
        <Link
          href="/"
          className="mt-4 inline-block text-sm font-semibold text-lmn-primary"
        >
          ← Back home
        </Link>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-[100dvh] bg-white px-4 py-10">
        <div className="mx-auto max-w-3xl space-y-3">
          <div className="h-48 animate-pulse rounded-2xl bg-lmn-card" />
          <div className="h-6 w-2/3 animate-pulse rounded bg-lmn-card" />
          <div className="h-24 animate-pulse rounded-xl bg-lmn-card" />
        </div>
      </div>
    );
  }

  const priceLine = formatPriceRangeLakh(property.price_min, property.price_max);
  const statusUpper = String(property.status).toUpperCase();
  const showNewBadge =
    !property.verified &&
    (statusUpper === "NEW" || statusUpper === "PENDING_REVIEW");
  const codeDisplay =
    property.property_code?.trim() ||
    `LMN-${property.city?.slice(0, 3).toUpperCase() || "BDR"}-${property.id.slice(0, 6)}`;
  const bath =
    property.bathrooms != null && property.bathrooms > 0
      ? `${property.bathrooms} Bath`
      : "— Bath";
  const readyLabel =
    property.verified || statusUpper === "ACTIVE"
      ? "Ready"
      : property.possession_status?.trim() || "—";
  const mapLat =
    property.latitude != null && Number.isFinite(property.latitude)
      ? property.latitude
      : geoCoords?.lat ?? null;
  const mapLng =
    property.longitude != null && Number.isFinite(property.longitude)
      ? property.longitude
      : geoCoords?.lng ?? null;
  const hasMapPin =
    mapLat != null && mapLng != null && Number.isFinite(mapLat) && Number.isFinite(mapLng);
  const mapIsApproximate =
    (property.latitude == null || !Number.isFinite(property.latitude)) &&
    geoCoords != null;

  return (
    <div className="min-h-[100dvh] bg-white pb-36 lg:pb-10">
      <header className="sticky top-14 z-30 flex items-center gap-2 border-b border-lmn-border bg-white px-4 py-3 sm:top-[3.75rem]">
        <Link
          href="/"
          className="flex size-12 min-h-[48px] min-w-[48px] shrink-0 items-center justify-center rounded-xl bg-lmn-card text-lg font-bold text-lmn-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lmn-primary focus-visible:ring-offset-2"
          aria-label="Back to home"
        >
          ←
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-sm font-bold leading-snug text-lmn-dark">
          {property.title}
        </h1>
        <button
          type="button"
          onClick={onSaveClick}
          className="shrink-0 rounded-xl bg-lmn-card px-3 py-2 text-xs font-semibold text-lmn-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lmn-primary"
        >
          Save
        </button>
        <button
          type="button"
          onClick={() => void share()}
          className="flex size-12 min-h-[48px] min-w-[48px] shrink-0 items-center justify-center rounded-xl bg-lmn-card text-base text-lmn-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lmn-primary"
          aria-label="Share"
        >
          📤
        </button>
      </header>

      <div className="lg:mx-auto lg:grid lg:max-w-7xl lg:grid-cols-2 lg:items-start lg:gap-10 lg:px-6">
      <div className="relative isolate h-[240px] w-full overflow-hidden bg-lmn-card lg:h-auto lg:min-h-[min(72vh,520px)] lg:max-h-[600px] lg:aspect-[4/3] lg:rounded-2xl lg:ring-1 lg:ring-lmn-border lg:sticky lg:top-20">
        {hasPhotos ? (
          <PropertyRemoteImage
            src={photos[slideIndex]!.url}
            alt=""
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            priority
            className="h-full w-full"
          />
        ) : null}

        {hasPhotos && photos.length > 1 ? (
          <div className="absolute bottom-2 left-2 right-2 hidden gap-2 overflow-x-auto rounded-xl bg-white/70 p-2 backdrop-blur [scrollbar-width:none] lg:flex [&::-webkit-scrollbar]:hidden">
            {photos.map((ph, i) => (
              <button
                key={String(ph.id ?? ph.url ?? i)}
                type="button"
                onClick={() => setSlideIndex(i)}
                className={
                  i === slideIndex
                    ? "relative h-14 w-20 shrink-0 overflow-hidden rounded-lg ring-2 ring-lmn-primary"
                    : "relative h-14 w-20 shrink-0 overflow-hidden rounded-lg ring-1 ring-lmn-border"
                }
                aria-label={`Photo ${i + 1}`}
              >
                <PropertyRemoteImage
                  src={ph.url}
                  alt=""
                  fill
                  sizes="80px"
                  className="size-full"
                  showSkeleton={false}
                />
              </button>
            ))}
          </div>
        ) : null}

        <div
          className="absolute inset-y-0 left-0 w-1/3 max-w-[120px]"
          aria-hidden
          onTouchStart={(e) => {
            touchStartX.current = e.touches[0]?.clientX ?? null;
          }}
          onTouchEnd={(e) => {
            const start = touchStartX.current;
            const end = e.changedTouches[0]?.clientX;
            touchStartX.current = null;
            if (start != null && end != null && end - start > 40) goPrev();
          }}
        />
        <div
          className="absolute inset-y-0 right-0 w-1/3 max-w-[120px]"
          aria-hidden
          onTouchStart={(e) => {
            touchStartX.current = e.touches[0]?.clientX ?? null;
          }}
          onTouchEnd={(e) => {
            const start = touchStartX.current;
            const end = e.changedTouches[0]?.clientX;
            touchStartX.current = null;
            if (start != null && end != null && start - end > 40) goNext();
          }}
        />

        {slideCount > 1 ? (
          <div
            className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5"
            role="tablist"
            aria-label="Photos"
          >
            {Array.from({ length: slideCount }).map((_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === slideIndex}
                aria-label={`Photo ${i + 1}`}
                onClick={() => setSlideIndex(i)}
                className={
                  i === slideIndex
                    ? "h-2 w-2 rounded-full bg-lmn-primary shadow-sm"
                    : "h-2 w-2 rounded-full bg-white/70"
                }
              />
            ))}
          </div>
        ) : null}
      </div>

      <div className="min-w-0 px-4 pt-4 lg:px-0 lg:pt-6">
        <p className="inline-flex rounded-full bg-lmn-card px-3 py-1 text-xs font-bold text-lmn-muted ring-1 ring-lmn-border">
          {codeDisplay}
        </p>

        <p className="mt-3 text-2xl font-bold leading-tight text-lmn-primary">
          {priceLine}
          <span className="text-base font-semibold text-lmn-muted">
            {" "}
            • Negotiable
          </span>
        </p>

        <h2 className="mt-3 text-base font-bold leading-snug text-lmn-dark">
          {property.title}
        </h2>
        <p className="mt-1 flex items-start gap-1 text-sm text-lmn-muted">
          <span className="shrink-0" aria-hidden>
            📍
          </span>
          <span>
            {property.city}, {property.locality}
          </span>
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          {property.verified ? (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-lmn-verified px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
              <span aria-hidden>✓</span> Verified
            </span>
          ) : null}
          {showNewBadge ? (
            <span className="inline-flex rounded-full bg-amber-400 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-lmn-dark">
              NEW
            </span>
          ) : null}
          <span className="inline-flex rounded-full bg-lmn-card px-2.5 py-1 text-[11px] font-semibold text-lmn-dark ring-1 ring-lmn-border">
            {typeLabel(property.type)}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {[
            `${property.area_sqft} sqft`,
            property.configuration || "—",
            bath,
            readyLabel,
          ].map((chip) => (
            <span
              key={chip}
              className="inline-flex rounded-xl bg-lmn-card px-3 py-2 text-xs font-semibold text-lmn-dark ring-1 ring-lmn-border"
            >
              {chip}
            </span>
          ))}
        </div>

        <hr className="my-5 border-0 border-t border-lmn-border" />

        <section className="pb-2" aria-labelledby="description-heading">
          <h3
            id="description-heading"
            className="text-sm font-extrabold text-lmn-dark"
          >
            Description
          </h3>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-lmn-muted">
            {property.description?.trim() ||
              "No description has been added for this listing yet."}
          </p>
        </section>

        <section
          className="mt-6 pb-2"
          aria-labelledby="location-heading"
        >
          <h3
            id="location-heading"
            className="text-sm font-extrabold text-lmn-dark"
          >
            Location
          </h3>
          {hasMapPin ? (
            <div className="mt-3 overflow-hidden rounded-2xl ring-1 ring-lmn-border">
              <iframe
                title="Property location"
                className="block h-[200px] w-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src={openStreetMapEmbedUrl(mapLat!, mapLng!)}
              />
              {mapIsApproximate ? (
                <p className="border-t border-lmn-border bg-amber-50 px-3 py-1.5 text-center text-[11px] text-lmn-dark">
                  Approximate pin from city / locality (exact GPS not set on
                  this listing).
                </p>
              ) : null}
              <a
                href={`https://www.openstreetmap.org/?mlat=${mapLat}&mlon=${mapLng}#map=16/${mapLat}/${mapLng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block border-t border-lmn-border bg-lmn-card px-3 py-2 text-center text-xs font-semibold text-lmn-primary"
              >
                Open full map
              </a>
            </div>
          ) : geoStatus === "loading" ? (
            <div className="mt-3 flex min-h-[120px] items-center justify-center rounded-2xl bg-lmn-card text-sm font-medium text-lmn-muted ring-1 ring-lmn-border">
              Finding map from address…
            </div>
          ) : (
            <div className="mt-3 flex min-h-[120px] flex-col items-center justify-center gap-2 rounded-2xl bg-lmn-card px-4 text-center text-sm font-medium text-lmn-muted ring-1 ring-lmn-border">
              <span className="flex items-center gap-2">
                <span aria-hidden>📍</span>
                Map unavailable
              </span>
              <span className="text-xs font-normal text-lmn-muted/90">
                Could not resolve this address to coordinates. Add latitude and
                longitude on the listing for an exact pin.
              </span>
            </div>
          )}
        </section>

        <p className="mt-4 text-sm font-medium text-lmn-muted">
          <span aria-hidden>👁</span> {property.view_count} views this week
        </p>

        <div className="mt-8 hidden gap-3 pb-8 lg:flex">
          <button
            type="button"
            onClick={() => void onCall()}
            disabled={pendingCall}
            className="flex min-h-[48px] min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-lmn-primary px-4 text-sm font-semibold text-white disabled:opacity-60"
          >
            <span aria-hidden>📞</span>
            {pendingCall ? "…" : "Call Now"}
          </button>
          <button
            type="button"
            onClick={() => void onWhatsApp()}
            disabled={pendingWhatsApp}
            className="flex min-h-[48px] min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-lmn-whatsapp px-4 text-sm font-semibold text-white disabled:opacity-60"
          >
            <span aria-hidden>💬</span>
            {pendingWhatsApp ? "…" : "WhatsApp"}
          </button>
          <button
            type="button"
            onClick={() => setVisitOpen(true)}
            className="flex min-h-[48px] min-w-0 flex-1 items-center justify-center gap-2 rounded-xl border border-lmn-border bg-lmn-card px-4 text-sm font-semibold text-lmn-dark"
          >
            <span aria-hidden>📅</span>
            Schedule Visit
          </button>
        </div>
      </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center border-t border-lmn-border bg-white pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] shadow-[0_-2px_12px_rgba(0,0,0,0.08)] lg:hidden">
        <div className="flex w-full max-w-3xl">
          <button
            type="button"
            onClick={() => void onCall()}
            disabled={pendingCall}
            className="flex min-h-[48px] min-w-0 flex-1 items-center justify-center gap-1 bg-lmn-primary px-1 text-xs font-semibold text-white disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-lmn-primary"
          >
            <span aria-hidden>📞</span>
            {pendingCall ? "…" : "Call Now"}
          </button>
          <button
            type="button"
            onClick={() => void onWhatsApp()}
            disabled={pendingWhatsApp}
            className="flex min-h-[48px] min-w-0 flex-1 items-center justify-center gap-1 bg-lmn-whatsapp px-1 text-xs font-semibold text-white disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-lmn-whatsapp"
          >
            <span aria-hidden>💬</span>
            {pendingWhatsApp ? "…" : "WhatsApp"}
          </button>
          <button
            type="button"
            onClick={() => setVisitOpen(true)}
            className="flex min-h-[48px] min-w-0 flex-1 items-center justify-center gap-1 border-l border-lmn-border bg-lmn-card px-1 text-xs font-semibold text-lmn-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-lmn-primary"
          >
            <span aria-hidden>📅</span>
            <span className="text-center leading-tight">Schedule Visit</span>
          </button>
        </div>
      </div>

      {visitOpen ? (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end bg-black/40 p-0">
          <div className="max-h-[85dvh] overflow-y-auto rounded-t-2xl border-t border-lmn-border bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-base font-extrabold text-lmn-dark">
                  Book a visit
                </h2>
                <p className="mt-0.5 line-clamp-2 text-xs text-lmn-muted">
                  {property.title}
                </p>
                <p className="mt-1 text-[11px] font-medium text-lmn-primary">
                  Sent instantly to the seller — no waiting for approval.
                </p>
              </div>
              <button
                type="button"
                className="min-h-[48px] px-2 text-sm font-semibold text-lmn-muted"
                onClick={() => setVisitOpen(false)}
              >
                Close
              </button>
            </div>
            <p className="mb-3 text-xs font-semibold text-lmn-muted">
              Next 7 days
            </p>
            <div className="-mx-1 mb-4 flex gap-2 overflow-x-auto pb-1">
              {days.map(({ ymd, dow, dayNum }) => (
                <button
                  key={ymd}
                  type="button"
                  onClick={() => setSelectedYmd(ymd)}
                  className={
                    selectedYmd === ymd
                      ? "flex h-[72px] w-[50px] shrink-0 flex-col items-center justify-center rounded-xl bg-lmn-primary text-white"
                      : "flex h-[72px] w-[50px] shrink-0 flex-col items-center justify-center rounded-xl border border-lmn-border bg-white"
                  }
                >
                  <span className="text-[11px] font-semibold capitalize">
                    {dow}
                  </span>
                  <span className="text-lg font-extrabold">{dayNum}</span>
                </button>
              ))}
            </div>
            <p className="mb-2 text-xs font-semibold text-lmn-muted">Time</p>
            <div className="mb-4 grid grid-cols-3 gap-2">
              {TIME_SLOTS.map(({ label, value }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSelectedTime(value)}
                  className={
                    selectedTime === value
                      ? "min-h-[48px] rounded-xl bg-lmn-primary py-3 text-xs font-semibold text-white"
                      : "min-h-[48px] rounded-xl border border-lmn-border py-3 text-xs font-semibold text-lmn-dark"
                  }
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="mb-3">
              <PhoneDigitsField
                id="visit-phone"
                label="Your mobile number (for the seller to reach you)"
                value={visitDigits}
                onChange={setVisitDigits}
                disabled={visitBusy}
              />
            </div>
            <button
              type="button"
              disabled={visitBusy}
              onClick={() => void onConfirmVisit()}
              className="flex min-h-[48px] w-full items-center justify-center rounded-xl bg-lmn-primary text-base font-semibold text-white disabled:opacity-50"
            >
              {visitBusy ? "Booking…" : "Book visit"}
            </button>
          </div>
        </div>
      ) : null}

      {saveOpen ? (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end bg-black/40">
          <div className="rounded-t-2xl border-t border-lmn-border bg-white p-4">
            <h2 className="mb-3 text-base font-extrabold text-lmn-dark">
              Save listing
            </h2>
            {saveStep === "phone" ? (
              <>
                <div className="mb-3">
                  <PhoneDigitsField
                    label="Mobile number"
                    value={saveDigits}
                    onChange={setSaveDigits}
                    disabled={saveBusy}
                  />
                </div>
                <button
                  type="button"
                  disabled={saveBusy}
                  onClick={() => void onSaveSendOtp()}
                  className="flex min-h-[48px] w-full items-center justify-center rounded-xl bg-lmn-primary font-semibold text-white"
                >
                  Send OTP
                </button>
              </>
            ) : (
              <>
                <input
                  className="mb-3 min-h-[48px] w-full rounded-xl border border-lmn-border px-3 text-lmn-dark outline-none focus:border-lmn-primary"
                  placeholder="OTP"
                  value={saveOtp}
                  onChange={(e) => setSaveOtp(e.target.value)}
                />
                <button
                  type="button"
                  disabled={saveBusy}
                  onClick={() => void onSaveVerify()}
                  className="flex min-h-[48px] w-full items-center justify-center rounded-xl bg-lmn-dark font-semibold text-white"
                >
                  Verify & save
                </button>
              </>
            )}
            <button
              type="button"
              className="mt-2 w-full py-2 text-sm text-lmn-muted"
              onClick={() => setSaveOpen(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {notifyOpen ? (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end bg-black/40">
          <div className="rounded-t-2xl border-t border-lmn-border bg-white p-4">
            <h2 className="mb-2 text-base font-extrabold text-lmn-dark">
              Stay updated
            </h2>
            <p className="mb-3 text-sm text-lmn-muted">
              Get notified about new listings in {property.city}.
            </p>
            {notifyStep === "phone" ? (
              <>
                <div className="mb-3">
                  <PhoneDigitsField
                    label="Mobile number"
                    value={notifyDigits}
                    onChange={setNotifyDigits}
                    disabled={notifyBusy}
                  />
                </div>
                <button
                  type="button"
                  disabled={notifyBusy}
                  onClick={() => void onNotifySendOtp()}
                  className="flex min-h-[48px] w-full items-center justify-center rounded-xl bg-lmn-primary font-semibold text-white"
                >
                  Send OTP
                </button>
              </>
            ) : (
              <>
                <input
                  className="mb-3 min-h-[48px] w-full rounded-xl border border-lmn-border px-3 text-lmn-dark outline-none focus:border-lmn-primary"
                  placeholder="OTP"
                  value={notifyOtp}
                  onChange={(e) => setNotifyOtp(e.target.value)}
                />
                <button
                  type="button"
                  disabled={notifyBusy}
                  onClick={() => void onNotifySubmit()}
                  className="flex min-h-[48px] w-full items-center justify-center rounded-xl bg-lmn-dark font-semibold text-white"
                >
                  Verify & register
                </button>
              </>
            )}
            <button
              type="button"
              className="mt-2 w-full py-2 text-sm text-lmn-muted"
              onClick={() => {
                setNotifyMeShown(true);
                setNotifyOpen(false);
              }}
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
