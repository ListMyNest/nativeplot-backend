"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { compressImageForUpload } from "../../../lib/imageCompress";
import { LocalPreviewImage } from "../../../components/property/LocalPreviewImage";
import {
  createProperty,
  getPhotoUploadUrl,
  registerPropertyPhoto,
} from "../../../lib/api";
import { useAuthStore } from "../../../lib/store";
import { showToast } from "../../../lib/toast";

const CITIES = [
  "Bidar",
  "Humnabad",
  "Basavakalyan",
  "Bhalki",
  "Aurad",
] as const;

const TYPES = [
  { v: "PLOT", icon: "📐", label: "Plot" },
  { v: "AGRICULTURAL", icon: "🌾", label: "Agricultural" },
  { v: "RENT", icon: "🔑", label: "Rent" },
] as const;

const CONFIGS = [
  { v: "_1BHK", l: "1 BHK" },
  { v: "_2BHK", l: "2 BHK" },
  { v: "_3BHK", l: "3 BHK" },
] as const;

const POSSESSION = [
  { v: "READY", l: "Available now" },
  { v: "UNDER_CONSTRUCTION", l: "Under Construction" },
  { v: "BARE_SHELL", l: "Bare Shell" },
] as const;

export default function SellerAddListingPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.token);
  const role = useAuthStore((s) => s.role);
  const hydrateFromStorage = useAuthStore((s) => s.hydrateFromStorage);

  const [title, setTitle] = useState("");
  const [typeGroup, setTypeGroup] = useState<(typeof TYPES)[number]["v"]>("PLOT");
  const [rentKind, setRentKind] = useState<"HOME" | "COMMERCIAL">("HOME");
  const [city, setCity] = useState("Bidar");
  const [locality, setLocality] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [areaSqft, setAreaSqft] = useState("");
  const [configuration, setConfiguration] = useState("_2BHK");
  const [bathrooms, setBathrooms] = useState(2);
  const [possession, setPossession] = useState("READY");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [primaryIdx, setPrimaryIdx] = useState(0);
  const [busy, setBusy] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [createdId, setCreatedId] = useState("");

  const [err, setErr] = useState<Record<string, string>>({});

  const isRent = typeGroup === "RENT";
  const isRentCommercial = isRent && rentKind === "COMMERCIAL";
  const showRentHomeDetails = isRent && rentKind === "HOME";
  const propertyType =
    typeGroup === "RENT"
      ? rentKind === "HOME"
        ? "RENT_HOME"
        : "RENT_COMMERCIAL"
      : typeGroup;

  useEffect(() => {
    hydrateFromStorage();
  }, [hydrateFromStorage]);

  useEffect(() => {
    if (!token || String(role).toUpperCase() !== "SELLER") {
      router.replace("/seller/login");
    }
  }, [token, role, router]);

  const uploadPhotos = useCallback(
    async (propertyId: string, list: File[]) => {
      const total = list.length;
      for (let i = 0; i < list.length; i++) {
        const raw = list[i];
        try {
          const file = await compressImageForUpload(raw);
          const up = await getPhotoUploadUrl(propertyId, file.name);
          const uploadUrl = up.uploadUrl ?? up.upload_url;
          const storagePath = (up.storagePath ?? up.storage_path ?? "").trim();
          if (!uploadUrl) {
            showToast(`Could not get upload URL for ${file.name}`, "error");
            continue;
          }
          const put = await fetch(uploadUrl, {
            method: "PUT",
            body: file,
            headers: { "Content-Type": file.type || "image/jpeg" },
          });
          if (!put.ok) {
            showToast(`Upload failed for ${file.name}`, "error");
            continue;
          }
          // Persist stable object path (Supabase/local). Stripping ? from the signed PUT URL is not a valid public image URL.
          const storageForRegister =
            storagePath ||
            (() => {
              try {
                const u = new URL(uploadUrl.split("?")[0] ?? uploadUrl);
                const idx = u.pathname.indexOf("/mock-upload/");
                if (idx >= 0) return u.pathname.slice(idx + "/mock-upload/".length);
              } catch {
                /* ignore */
              }
              return uploadUrl.split("?")[0] ?? uploadUrl;
            })();
          await registerPropertyPhoto(propertyId, {
            storageUrl: storageForRegister,
            isPrimary: i === primaryIdx,
          });
          setUploadPct(Math.round(((i + 1) / total) * 100));
        } catch (e) {
          showToast(
            e instanceof Error ? e.message : `Upload failed for ${raw.name}`,
            "error"
          );
        }
      }
    },
    [primaryIdx]
  );

  const validateAll = () => {
    const e: Record<string, string> = {};
    if (title.trim().length < 10)
      e.title = "Title must be at least 10 characters.";
    if (!locality.trim()) e.locality = "Locality is required.";
    const pm = Number(priceMin);
    const px = Number(priceMax);
    const ar = Number(areaSqft);
    if (!pm || !px) {
      e.price = isRent
        ? "Enter min and max rent (₹)."
        : "Enter min and max price (lakhs).";
    }
    if (pm && px && px <= pm) e.price = "Max price must be greater than min.";
    if (!ar || ar <= 0) e.area = "Enter valid area in sqft.";
    if (description.length > 500)
      e.description = "Description max 500 characters.";
    if (files.length < 4) e.photos = "Add at least 4 photos.";
    setErr(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async () => {
    if (!validateAll() || !token) return;
    setBusy(true);
    setUploadPct(0);
    try {
      const pmRaw = Number(priceMin);
      const pxRaw = Number(priceMax);
      // Backend expects lakhs. For Rent we accept ₹ input and convert to lakhs.
      const pm = isRent ? pmRaw / 100000 : pmRaw;
      const px = isRent ? pxRaw / 100000 : pxRaw;
      const ar = Number(areaSqft);
      const created = (await createProperty({
        title: title.trim(),
        type: propertyType,
        city: city.trim(),
        locality: locality.trim(),
        priceMin: pm,
        priceMax: px,
        areaSqft: ar,
        ...(showRentHomeDetails ? { configuration } : {}),
        description: description.trim() || undefined,
        ...(showRentHomeDetails
          ? { bathrooms, possession: "READY" }
          : isRentCommercial
            ? { possession: "READY" }
            : { possession }),
      })) as Record<string, unknown>;
      const id = created.id != null ? String(created.id) : "";
      if (id && files.length > 0) {
        await uploadPhotos(id, files);
      }
      // Ensure newly created listings show up immediately on homepage/listing pages
      // (we otherwise cache for 5 minutes).
      void queryClient.invalidateQueries({ queryKey: ["homePropertyFeed"] });
      setCreatedId(id);
      showToast("Listing submitted!", "success");
      router.replace("/seller/dashboard");
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Could not create listing.",
        "error"
      );
    } finally {
      setBusy(false);
    }
  };

  const onFileChange = (list: FileList | null) => {
    if (!list || list.length === 0) return;
    const incoming = Array.from(list);
    setFiles((prev) => {
      const seen = new Set(prev.map((f) => `${f.name}|${f.size}|${f.lastModified}`));
      const merged = [...prev];
      for (const f of incoming) {
        const k = `${f.name}|${f.size}|${f.lastModified}`;
        if (seen.has(k)) continue;
        seen.add(k);
        merged.push(f);
      }
      return merged;
    });
  };

  const removeFileAt = (i: number) => {
    setFiles((prev) => prev.filter((_, j) => j !== i));
    setPrimaryIdx((p) => {
      if (p === i) return 0;
      if (p > i) return p - 1;
      return p;
    });
  };

  if (!token || String(role).toUpperCase() !== "SELLER") {
    return null;
  }

  return (
    <main className="mx-auto max-w-2xl py-6">
      <Link
        href="/seller/dashboard"
        className="inline-flex min-h-[48px] items-center text-sm font-semibold text-lmn-primary"
      >
        ← Dashboard
      </Link>

      <h1 className="font-heading mt-4 text-2xl font-extrabold text-text">
        Add listing
      </h1>

      <div className="mt-6 space-y-5">
          <label className="block text-xs font-semibold text-muted">
            Property title
            <input
              required
              maxLength={200}
              className="mt-2 min-h-[48px] w-full rounded-xl border border-border bg-surface px-4 text-text outline-none transition-[border-color,box-shadow] duration-fast focus:border-lmn-primary focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-2 focus:ring-offset-bg"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <span className="mt-1 block text-right text-xs text-muted">
              {title.length}/200
            </span>
            {err.title ? (
              <span className="text-xs text-lmn-primary">{err.title}</span>
            ) : null}
          </label>

          <div>
            <p className="text-xs font-semibold text-muted">Property type</p>
            <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {TYPES.map((t) => (
                <button
                  key={t.v}
                  type="button"
                  onClick={() => setTypeGroup(t.v)}
                  className={
                    typeGroup === t.v
                      ? "min-h-[72px] rounded-xl border-2 border-lmn-primary bg-red-50 p-3 text-left text-sm font-semibold"
                      : "min-h-[72px] rounded-xl border border-border bg-surface p-3 text-left text-sm font-medium text-text shadow-sm transition-[transform,box-shadow] duration-base hover:-translate-y-0.5 hover:shadow-md"
                  }
                >
                  <span className="text-xl">{t.icon}</span>
                  <br />
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {isRent ? (
            <div>
              <p className="text-xs font-semibold text-muted">Rent type</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(
                  [
                    ["HOME", "Home rental"],
                    ["COMMERCIAL", "Commercial"],
                  ] as const
                ).map(([v, label]) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setRentKind(v)}
                    className={
                      rentKind === v
                        ? "min-h-[44px] rounded-full bg-lmn-primary px-4 text-sm font-semibold text-white"
                        : "min-h-[44px] rounded-full border border-border bg-surface px-4 text-sm font-medium text-text shadow-sm"
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <label className="block text-xs font-semibold text-muted">
            City
            <select
              className="mt-2 min-h-[48px] w-full rounded-xl border border-border bg-surface px-4 text-text shadow-sm outline-none focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-2 focus:ring-offset-bg"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            >
              {CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-xs font-semibold text-muted">
            Locality / area
            <input
              required
              className="mt-2 min-h-[48px] w-full rounded-xl border border-border bg-surface px-4 text-text shadow-sm outline-none focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-2 focus:ring-offset-bg"
              value={locality}
              onChange={(e) => setLocality(e.target.value)}
            />
            <p className="mt-1 text-[11px] font-medium text-muted">
              Location pin is auto-detected from locality + city (no GPS needed).
            </p>
            {err.locality ? (
              <span className="text-xs text-lmn-primary">{err.locality}</span>
            ) : null}
          </label>

          <div className="mt-2 h-px bg-border" />
          <p className="text-sm text-muted">
            {isRent
              ? "Enter rent in rupees (e.g. 15000)"
              : "Enter prices in lakhs (e.g. 18 for ₹18L)"}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-semibold text-muted">
              {isRent ? "Min rent (₹)" : "Min price (₹ Lakhs)"}
              <input
                inputMode="decimal"
                className="mt-2 min-h-[48px] w-full rounded-xl border border-border bg-surface px-4 text-text shadow-sm outline-none focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-2 focus:ring-offset-bg"
                value={priceMin}
                onChange={(e) => setPriceMin(e.target.value)}
              />
            </label>
            <label className="text-xs font-semibold text-muted">
              {isRent ? "Max rent (₹)" : "Max price (₹ Lakhs)"}
              <input
                inputMode="decimal"
                className="mt-2 min-h-[48px] w-full rounded-xl border border-border bg-surface px-4 text-text shadow-sm outline-none focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-2 focus:ring-offset-bg"
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value)}
              />
            </label>
          </div>
          {err.price ? (
            <p className="text-xs text-lmn-primary">{err.price}</p>
          ) : null}

          <label className="block text-xs font-semibold text-muted">
            Area (sqft)
            <input
              inputMode="numeric"
              className="mt-2 min-h-[48px] w-full rounded-xl border border-border bg-surface px-4 text-text shadow-sm outline-none focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-2 focus:ring-offset-bg"
              value={areaSqft}
              onChange={(e) => setAreaSqft(e.target.value.replace(/\D/g, ""))}
            />
            {err.area ? (
              <span className="text-xs text-lmn-primary">{err.area}</span>
            ) : null}
          </label>

          {showRentHomeDetails ? (
            <>
              <div>
                <p className="text-xs font-semibold text-muted">Configuration</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {CONFIGS.map((c) => (
                    <button
                      key={c.v}
                      type="button"
                      onClick={() => setConfiguration(c.v)}
                      className={
                        configuration === c.v
                          ? "min-h-[44px] rounded-full bg-lmn-primary px-4 text-sm font-semibold text-white"
                          : "min-h-[44px] rounded-full border border-border bg-surface px-4 text-sm font-medium text-text shadow-sm"
                      }
                    >
                      {c.l}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-muted">Bathrooms</p>
                <div className="mt-2 flex items-center gap-4">
                  <button
                    type="button"
                    className="min-h-[48px] min-w-[48px] rounded-xl border border-border bg-surface text-xl text-text shadow-sm transition-[transform,box-shadow] duration-fast hover:shadow-md active:scale-[0.98]"
                    onClick={() => setBathrooms((b) => Math.max(0, b - 1))}
                  >
                    −
                  </button>
                  <span className="text-lg font-bold text-text">{bathrooms}</span>
                  <button
                    type="button"
                    className="min-h-[48px] min-w-[48px] rounded-xl border border-border bg-surface text-xl text-text shadow-sm transition-[transform,box-shadow] duration-fast hover:shadow-md active:scale-[0.98]"
                    onClick={() => setBathrooms((b) => b + 1)}
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-muted">Availability</p>
                <p className="mt-1 text-xs text-muted">Rent listings are treated as “Available now”.</p>
              </div>
            </>
          ) : isRentCommercial ? (
            <div>
              <p className="text-xs font-semibold text-muted">Availability</p>
              <p className="mt-1 text-xs text-muted">
                Commercial rent listings are treated as “Available now”.
              </p>
            </div>
          ) : (
            <div>
              <p className="text-xs font-semibold text-muted">Possession</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {POSSESSION.map((p) => (
                  <button
                    key={p.v}
                    type="button"
                    onClick={() => setPossession(p.v)}
                    className={
                      possession === p.v
                        ? "min-h-[44px] rounded-full bg-lmn-primary px-4 text-sm font-semibold text-white"
                        : "min-h-[44px] rounded-full border border-border bg-surface px-4 text-sm font-medium text-text shadow-sm"
                    }
                  >
                    {p.l}
                  </button>
                ))}
              </div>
            </div>
          )}

          <label className="block text-xs font-semibold text-muted">
            Description
            <textarea
              maxLength={500}
              rows={4}
              className="mt-2 w-full rounded-xl border border-border bg-surface p-4 text-text shadow-sm outline-none focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-2 focus:ring-offset-bg"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <span className="text-xs text-muted">
              {description.length}/500
            </span>
            {err.description ? (
              <span className="text-xs text-lmn-primary">{err.description}</span>
            ) : null}
          </label>

          <div className="mt-2 h-px bg-border" />
          <div className="rounded-2xl border-2 border-dashed border-border bg-surface p-6 text-center shadow-md">
            <p className="text-sm font-semibold text-text">
              Add minimum 4 photos
            </p>
            <p className="mt-1 text-xs text-muted">
              Tap a thumbnail to set as primary cover image
            </p>
            <label className="mt-4 inline-flex min-h-[48px] cursor-pointer items-center justify-center rounded-xl bg-lmn-primary px-6 text-sm font-semibold text-white shadow-sm transition-[transform,box-shadow] duration-fast hover:shadow-md active:scale-[0.98]">
              Add photos
              <input
                type="file"
                accept="image/*"
                multiple
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  onFileChange(e.target.files);
                  // allow selecting the same file again later
                  e.currentTarget.value = "";
                }}
              />
            </label>
          </div>
          <p className="text-sm font-semibold text-text">
            {files.length}/4 minimum photos added
          </p>
          {err.photos ? (
            <p className="text-xs text-lmn-primary">{err.photos}</p>
          ) : null}

          {files.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {files.map((f, i) => (
                <div
                  key={`${f.name}-${i}`}
                  className={
                    primaryIdx === i
                      ? "relative overflow-hidden rounded-xl ring-2 ring-lmn-primary"
                      : "relative overflow-hidden rounded-xl ring-1 ring-border"
                  }
                >
                  <button
                    type="button"
                    onClick={() => setPrimaryIdx(i)}
                    className="block w-full"
                  >
                    <div className="relative aspect-video w-full bg-surface2">
                      <LocalPreviewImage
                        file={f}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => removeFileAt(i)}
                    className="absolute right-1 top-1 flex size-8 items-center justify-center rounded-full bg-black/60 text-sm text-white shadow-sm"
                    aria-label="Remove"
                  >
                    ×
                  </button>
                  {primaryIdx === i ? (
                    <span className="absolute bottom-1 left-1 rounded bg-lmn-primary px-2 py-0.5 text-[10px] font-bold text-white">
                      Primary
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}

          {busy ? (
            <div className="space-y-2">
              <p className="text-center text-sm font-medium text-muted">
                Uploading… {uploadPct}%
              </p>
              <div className="h-2 w-full overflow-hidden rounded-full bg-border">
                <div
                  className="h-full rounded-full bg-lmn-primary transition-[width]"
                  style={{ width: `${uploadPct}%` }}
                />
              </div>
            </div>
          ) : null}

          <button
            type="button"
            disabled={busy}
            onClick={() => void onSubmit()}
            className="flex min-h-[48px] w-full items-center justify-center rounded-xl bg-lmn-primary font-semibold text-white shadow-sm transition-[transform,box-shadow,opacity] duration-fast hover:shadow-md hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100"
          >
            {busy ? "Submitting…" : "Submit Listing"}
          </button>
        </div>
    </main>
  );
}
