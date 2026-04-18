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
  { v: "RESIDENTIAL", icon: "🏠", label: "Residential" },
  { v: "PLOT", icon: "📐", label: "Plot" },
  { v: "COMMERCIAL", icon: "🏢", label: "Commercial" },
  { v: "AGRICULTURAL", icon: "🌾", label: "Agricultural" },
] as const;

const CONFIGS = [
  { v: "_1BHK", l: "1 BHK" },
  { v: "_2BHK", l: "2 BHK" },
  { v: "_3BHK", l: "3 BHK" },
  { v: "OPEN", l: "Open Plot" },
] as const;

const POSSESSION = [
  { v: "READY", l: "Ready to Move" },
  { v: "UNDER_CONSTRUCTION", l: "Under Construction" },
  { v: "BARE_SHELL", l: "Bare Shell" },
] as const;

type Step = 1 | 2 | 3 | 4;

export default function SellerAddListingPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.token);
  const role = useAuthStore((s) => s.role);
  const hydrateFromStorage = useAuthStore((s) => s.hydrateFromStorage);

  const [step, setStep] = useState<Step>(1);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("RESIDENTIAL");
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
        const file = await compressImageForUpload(raw);
        const up = await getPhotoUploadUrl(propertyId, file.name);
        const uploadUrl = up.uploadUrl ?? up.upload_url;
        const storagePath = (up.storagePath ?? up.storage_path ?? "").trim();
        if (!uploadUrl) continue;
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
      }
    },
    [primaryIdx]
  );

  const validateStep1 = () => {
    const e: Record<string, string> = {};
    if (title.trim().length < 10)
      e.title = "Title must be at least 10 characters.";
    if (!locality.trim()) e.locality = "Locality is required.";
    setErr(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e: Record<string, string> = {};
    const pm = Number(priceMin);
    const px = Number(priceMax);
    const ar = Number(areaSqft);
    if (!pm || !px) e.price = "Enter min and max price (lakhs).";
    if (pm && px && px <= pm) e.price = "Max price must be greater than min.";
    if (!ar || ar <= 0) e.area = "Enter valid area in sqft.";
    if (description.length > 500)
      e.description = "Description max 500 characters.";
    setErr(e);
    return Object.keys(e).length === 0;
  };

  const validateStep3 = () => {
    const e: Record<string, string> = {};
    if (files.length < 4) e.photos = "Add at least 4 photos.";
    setErr(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async () => {
    if (!validateStep3() || !token) return;
    setBusy(true);
    setUploadPct(0);
    try {
      const pm = Number(priceMin);
      const px = Number(priceMax);
      const ar = Number(areaSqft);
      const created = (await createProperty({
        title: title.trim(),
        type,
        city: city.trim(),
        locality: locality.trim(),
        priceMin: pm,
        priceMax: px,
        areaSqft: ar,
        configuration,
        description: description.trim() || undefined,
        bathrooms,
        possession,
      })) as Record<string, unknown>;
      const id = created.id != null ? String(created.id) : "";
      if (id && files.length > 0) {
        await uploadPhotos(id, files);
      }
      // Ensure newly created listings show up immediately on homepage/listing pages
      // (we otherwise cache for 5 minutes).
      void queryClient.invalidateQueries({ queryKey: ["homePropertyFeed"] });
      setCreatedId(id);
      setStep(4);
      showToast("Listing submitted!", "success");
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
    if (!list) {
      setFiles([]);
      return;
    }
    setFiles(Array.from(list));
    setPrimaryIdx(0);
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

      <div className="mt-4 flex gap-2">
        {([1, 2, 3, 4] as const).map((s) => (
          <div
            key={s}
            className={
              step >= s
                ? "h-1 flex-1 rounded-full bg-lmn-primary"
                : "h-1 flex-1 rounded-full bg-lmn-border"
            }
          />
        ))}
      </div>

      <h1 className="mt-4 text-2xl font-extrabold text-lmn-dark">
        Add listing
      </h1>

      {step === 1 ? (
        <div className="mt-6 space-y-5">
          <label className="block text-xs font-semibold text-lmn-muted">
            Property title
            <input
              required
              maxLength={200}
              className="mt-2 min-h-[48px] w-full rounded-xl border border-lmn-border px-4 text-lmn-dark outline-none focus:border-lmn-primary"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <span className="mt-1 block text-right text-xs text-lmn-muted">
              {title.length}/200
            </span>
            {err.title ? (
              <span className="text-xs text-lmn-primary">{err.title}</span>
            ) : null}
          </label>

          <div>
            <p className="text-xs font-semibold text-lmn-muted">Property type</p>
            <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {TYPES.map((t) => (
                <button
                  key={t.v}
                  type="button"
                  onClick={() => setType(t.v)}
                  className={
                    type === t.v
                      ? "min-h-[72px] rounded-xl border-2 border-lmn-primary bg-red-50 p-3 text-left text-sm font-semibold"
                      : "min-h-[72px] rounded-xl border border-lmn-border bg-white p-3 text-left text-sm font-medium"
                  }
                >
                  <span className="text-xl">{t.icon}</span>
                  <br />
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <label className="block text-xs font-semibold text-lmn-muted">
            City
            <select
              className="mt-2 min-h-[48px] w-full rounded-xl border border-lmn-border px-4"
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

          <label className="block text-xs font-semibold text-lmn-muted">
            Locality / area
            <input
              required
              className="mt-2 min-h-[48px] w-full rounded-xl border border-lmn-border px-4"
              value={locality}
              onChange={(e) => setLocality(e.target.value)}
            />
            <p className="mt-1 text-[11px] font-medium text-lmn-muted">
              Location pin is auto-detected from locality + city (no GPS needed).
            </p>
            {err.locality ? (
              <span className="text-xs text-lmn-primary">{err.locality}</span>
            ) : null}
          </label>

          <button
            type="button"
            onClick={() => validateStep1() && setStep(2)}
            className="flex min-h-[48px] w-full items-center justify-center rounded-xl bg-lmn-primary font-semibold text-white"
          >
            Next →
          </button>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="mt-6 space-y-5">
          <p className="text-sm text-lmn-muted">
            Enter prices in lakhs (e.g. 18 for ₹18L)
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-semibold text-lmn-muted">
              Min price (₹ Lakhs)
              <input
                inputMode="decimal"
                className="mt-2 min-h-[48px] w-full rounded-xl border border-lmn-border px-4"
                value={priceMin}
                onChange={(e) => setPriceMin(e.target.value)}
              />
            </label>
            <label className="text-xs font-semibold text-lmn-muted">
              Max price (₹ Lakhs)
              <input
                inputMode="decimal"
                className="mt-2 min-h-[48px] w-full rounded-xl border border-lmn-border px-4"
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value)}
              />
            </label>
          </div>
          {err.price ? (
            <p className="text-xs text-lmn-primary">{err.price}</p>
          ) : null}

          <label className="block text-xs font-semibold text-lmn-muted">
            Area (sqft)
            <input
              inputMode="numeric"
              className="mt-2 min-h-[48px] w-full rounded-xl border border-lmn-border px-4"
              value={areaSqft}
              onChange={(e) => setAreaSqft(e.target.value.replace(/\D/g, ""))}
            />
            {err.area ? (
              <span className="text-xs text-lmn-primary">{err.area}</span>
            ) : null}
          </label>

          <div>
            <p className="text-xs font-semibold text-lmn-muted">Configuration</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {CONFIGS.map((c) => (
                <button
                  key={c.v}
                  type="button"
                  onClick={() => setConfiguration(c.v)}
                  className={
                    configuration === c.v
                      ? "min-h-[44px] rounded-full bg-lmn-primary px-4 text-sm font-semibold text-white"
                      : "min-h-[44px] rounded-full border border-lmn-border px-4 text-sm font-medium"
                  }
                >
                  {c.l}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-lmn-muted">Bathrooms</p>
            <div className="mt-2 flex items-center gap-4">
              <button
                type="button"
                className="min-h-[48px] min-w-[48px] rounded-xl border border-lmn-border text-xl"
                onClick={() => setBathrooms((b) => Math.max(0, b - 1))}
              >
                −
              </button>
              <span className="text-lg font-bold">{bathrooms}</span>
              <button
                type="button"
                className="min-h-[48px] min-w-[48px] rounded-xl border border-lmn-border text-xl"
                onClick={() => setBathrooms((b) => b + 1)}
              >
                +
              </button>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-lmn-muted">Possession</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {POSSESSION.map((p) => (
                <button
                  key={p.v}
                  type="button"
                  onClick={() => setPossession(p.v)}
                  className={
                    possession === p.v
                      ? "min-h-[44px] rounded-full bg-lmn-primary px-4 text-sm font-semibold text-white"
                      : "min-h-[44px] rounded-full border border-lmn-border px-4 text-sm font-medium"
                  }
                >
                  {p.l}
                </button>
              ))}
            </div>
          </div>

          <label className="block text-xs font-semibold text-lmn-muted">
            Description
            <textarea
              maxLength={500}
              rows={4}
              className="mt-2 w-full rounded-xl border border-lmn-border p-4"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <span className="text-xs text-lmn-muted">
              {description.length}/500
            </span>
            {err.description ? (
              <span className="text-xs text-lmn-primary">{err.description}</span>
            ) : null}
          </label>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex min-h-[48px] flex-1 items-center justify-center rounded-xl border border-lmn-border font-semibold"
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={() => validateStep2() && setStep(3)}
              className="flex min-h-[48px] flex-1 items-center justify-center rounded-xl bg-lmn-primary font-semibold text-white"
            >
              Next →
            </button>
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="mt-6 space-y-5">
          <div className="rounded-xl border-2 border-dashed border-lmn-border bg-lmn-card p-6 text-center">
            <p className="text-sm font-semibold text-lmn-dark">
              Add minimum 4 photos
            </p>
            <p className="mt-1 text-xs text-lmn-muted">
              Tap a thumbnail to set as primary cover image
            </p>
            <label className="mt-4 inline-flex min-h-[48px] cursor-pointer items-center justify-center rounded-xl bg-lmn-primary px-6 text-sm font-semibold text-white">
              Choose photos
              <input
                type="file"
                accept="image/*"
                multiple
                capture="environment"
                className="hidden"
                onChange={(e) => onFileChange(e.target.files)}
              />
            </label>
          </div>
          <p className="text-sm font-semibold text-lmn-dark">
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
                      : "relative overflow-hidden rounded-xl ring-1 ring-lmn-border"
                  }
                >
                  <button
                    type="button"
                    onClick={() => setPrimaryIdx(i)}
                    className="block w-full"
                  >
                    <LocalPreviewImage
                      file={f}
                      alt=""
                      className="aspect-video w-full object-cover"
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeFileAt(i)}
                    className="absolute right-1 top-1 flex size-8 items-center justify-center rounded-full bg-black/60 text-sm text-white"
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
            <p className="text-center text-sm font-medium text-lmn-muted">
              Uploading… {uploadPct}%
            </p>
          ) : null}

          <div className="flex gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => setStep(2)}
              className="flex min-h-[48px] flex-1 items-center justify-center rounded-xl border border-lmn-border font-semibold disabled:opacity-50"
            >
              ← Back
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void onSubmit()}
              className="flex min-h-[48px] flex-1 items-center justify-center rounded-xl bg-lmn-primary font-semibold text-white disabled:opacity-50"
            >
              {busy ? "Submitting…" : "Submit Listing →"}
            </button>
          </div>
        </div>
      ) : null}

      {step === 4 ? (
        <div className="mt-10 space-y-6 text-center">
          <div className="text-6xl" aria-hidden>
            ✓
          </div>
          <h2 className="text-2xl font-extrabold text-lmn-dark">
            Listing Submitted!
          </h2>
          <p className="text-sm text-lmn-muted">
            Our team will verify your listing within 24 hours.
          </p>
          {createdId ? (
            <p className="font-mono text-sm text-lmn-dark">
              Property ID: {createdId}
            </p>
          ) : null}
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/seller/dashboard"
              className="flex min-h-[48px] items-center justify-center rounded-xl bg-lmn-primary px-6 font-semibold text-white"
            >
              View My Dashboard
            </Link>
            <button
              type="button"
              onClick={() => {
                setStep(1);
                setTitle("");
                setFiles([]);
                setCreatedId("");
              }}
              className="flex min-h-[48px] items-center justify-center rounded-xl border border-lmn-border px-6 font-semibold"
            >
              Add Another Property
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
