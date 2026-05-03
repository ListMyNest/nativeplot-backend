import type { PaginatedResponse, PropertyListItem } from "../types";
import { ensureSessionHash, getSessionHash } from "./session";
import { useAuthStore } from "./store";
import { showToast } from "./toast";

/** Collapse mistaken `.../v1/v1/...` (common copy-paste) so Spring sees a single `/v1` prefix. */
function collapseDuplicateApiVersionSegment(url: string): string {
  let u = url;
  while (u.includes("/v1/v1")) {
    u = u.replaceAll("/v1/v1", "/v1");
  }
  return u;
}

/**
 * Public API base ending with `/v1` (no trailing slash), or same-origin `/v1` when env is empty in the
 * browser (Next.js rewrites `/v1/*` to the backend — avoids CORS and wrong host).
 */
function normalizePublicApiBaseUrl(raw: string | undefined): string {
  const s = (raw ?? "").trim().replace(/\/+$/, "");
  if (!s) {
    return typeof window !== "undefined" ? "/v1" : "http://localhost:8080/v1";
  }
  if (s.startsWith("http://") || s.startsWith("https://")) {
    let out = s;
    if (!/\/v\d+$/i.test(out)) {
      out = `${out}/v1`;
    }
    return collapseDuplicateApiVersionSegment(out);
  }
  let out = s.startsWith("/") ? s : `/${s}`;
  if (!/\/v\d+$/i.test(out)) {
    out = `${out.replace(/\/+$/, "")}/v1`;
  }
  return collapseDuplicateApiVersionSegment(out);
}

export const BASE_URL =
  typeof process !== "undefined"
    ? normalizePublicApiBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL)
    : "http://localhost:8080/v1";

/** API host without `/v1` — for resolving relative mock-upload / storage paths. */
export function getApiOrigin(): string {
  const trimmed = BASE_URL.replace(/\/+$/, "");
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed.replace(/\/v1$/i, "") || "http://localhost:8080";
  }
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "http://localhost:8080";
}

export function toAbsoluteAssetUrl(
  pathOrUrl: string | null | undefined
): string | null {
  if (pathOrUrl == null) return null;
  const s = String(pathOrUrl).trim();
  if (!s) return null;
  if (s.startsWith("http://") || s.startsWith("https://")) {
    try {
      const u = new URL(s);
      const i = u.pathname.indexOf("/mock-upload/");
      if (i >= 0) {
        return `${u.pathname}${u.search}` || null;
      }
    } catch {
      /* ignore */
    }
    return s;
  }
  const clean = s.replace(/^\/+/, "");
  if (clean.startsWith("mock-upload/")) {
    return `/${clean}`;
  }
  if (clean.startsWith("properties/")) {
    return `/mock-upload/${clean}`;
  }
  const origin = getApiOrigin();
  return s.startsWith("/") ? origin + s : `${origin}/${clean}`;
}

/** Seller / agent / admin JWT from localStorage */
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("lmn_token");
}

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, body: unknown, message?: string) {
    super(message ?? `Request failed with status ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

type AuthMode = "default" | "buyer" | "none";

type ApiFetchOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  auth?: AuthMode;
  /** When true, skip the global toast for HTTP 5xx (caller handles errors). */
  suppressErrorToast?: boolean;
  /** When true, skip browser console success/error lines (default logs in development only). */
  suppressDevLog?: boolean;
};

/** Readable message from {@link ApiError} or generic errors (for inline UI). */
export function getApiErrorMessage(e: unknown, fallback: string): string {
  if (e instanceof ApiError && e.message.trim()) return e.message;
  if (e instanceof Error && e.message.trim()) return e.message;
  return fallback;
}

function getBearer(auth: AuthMode): string | null {
  if (auth === "none") return null;
  if (typeof window === "undefined") return null;
  if (auth === "buyer") {
    return sessionStorage.getItem("lmn_buyer_token");
  }
  return getToken();
}

function redirectAfterUnauthorized(): void {
  if (typeof window === "undefined") return;
  const path = window.location.pathname;
  if (path.includes("/admin")) {
    window.location.href = "/admin/login";
    return;
  }
  if (path.includes("/seller")) {
    window.location.href = "/seller/login";
    return;
  }
  if (path.includes("/agent")) {
    window.location.href = "/agent/login";
    return;
  }
}

function clearAuthIfNeeded(auth: AuthMode): void {
  if (typeof window === "undefined") return;
  if (auth === "buyer") {
    sessionStorage.removeItem("lmn_buyer_token");
    sessionStorage.removeItem("lmn_buyer_id");
    useAuthStore.getState().clearBuyer();
    return;
  }
  if (auth === "default") {
    useAuthStore.getState().logout();
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const {
    body,
    auth = "default",
    suppressErrorToast = false,
    suppressDevLog = false,
    headers: hdrs,
    ...rest
  } = options;
  const token = getBearer(auth);
  const url = `${BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const shortPath = path.startsWith("/") ? path : `/${path}`;
  const method = String(rest.method ?? "GET").toUpperCase();
  const devLog =
    !suppressDevLog &&
    typeof process !== "undefined" &&
    process.env.NODE_ENV === "development" &&
    typeof window !== "undefined";

  const headers: HeadersInit = {
    Accept: "application/json",
    ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...hdrs,
  };

  const init: RequestInit = {
    ...rest,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  };

  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : "Network request failed";
    if (devLog) {
      console.error(`[ListMyNest API] NETWORK ${method} ${shortPath}`, e);
    }
    if (!suppressErrorToast) {
      showToast("Network error. Check connection.", "error");
    }
    throw new ApiError(0, null, msg);
  }
  const text = await res.text();
  let parsed: unknown = text;
  if (text) {
    try {
      parsed = JSON.parse(text) as unknown;
    } catch {
      parsed = text;
    }
  } else {
    parsed = undefined;
  }

  if (!res.ok) {
    if (res.status === 401) {
      clearAuthIfNeeded(auth);
      if (auth === "default" && typeof window !== "undefined") {
        redirectAfterUnauthorized();
      }
    }
    type FieldErr = { field?: string; message?: string };
    const fieldErrors =
      typeof parsed === "object" &&
      parsed !== null &&
      "fieldErrors" in parsed &&
      Array.isArray((parsed as { fieldErrors: unknown }).fieldErrors)
        ? ((parsed as { fieldErrors: FieldErr[] }).fieldErrors as FieldErr[])
        : [];
    const fieldMsg =
      fieldErrors.length > 0
        ? fieldErrors
            .map((e) =>
              e.field && e.message
                ? `${e.field}: ${e.message}`
                : (e.message ?? "")
            )
            .filter(Boolean)
            .join(" ")
        : undefined;
    const msg =
      fieldMsg ||
      (typeof parsed === "object" &&
      parsed !== null &&
      "message" in parsed &&
      typeof (parsed as { message: unknown }).message === "string"
        ? (parsed as { message: string }).message
        : typeof parsed === "object" &&
            parsed !== null &&
            "error" in parsed &&
            typeof (parsed as { error: unknown }).error === "string"
          ? (parsed as { error: string }).error
          : undefined);
    if (res.status >= 500 && !suppressErrorToast) {
      showToast(msg ?? "Server error. Try again.", "error");
    }
    if (devLog) {
      console.error(
        `[ListMyNest API] FAIL ${method} ${shortPath} → HTTP ${res.status}`,
        msg ?? parsed
      );
    }
    throw new ApiError(res.status, parsed, msg);
  }

  if (devLog) {
    console.info(
      `[ListMyNest API] OK ${method} ${shortPath} → HTTP ${res.status}`
    );
  }

  return parsed as T;
}

function num(v: unknown, fallback = 0): number {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isNaN(n) ? fallback : n;
  }
  return fallback;
}

/** Maps backend PublicPropertyDTO (camelCase) + legacy snake to PropertyListItem. */
export function normalizePropertyListItem(raw: Record<string, unknown>): PropertyListItem {
  const id = String(raw.id ?? "");
  const priceMin = num(raw.priceMin ?? raw.price_min);
  const priceMax = num(raw.priceMax ?? raw.price_max);
  const rawPrimary =
    (raw.primaryPhoto as string | null | undefined) ??
    (raw.primary_photo as string | null | undefined) ??
    null;
  return {
    id,
    title: String(raw.title ?? ""),
    type: String(raw.type ?? "RESIDENTIAL"),
    city: String(raw.city ?? ""),
    locality: String(raw.locality ?? ""),
    price_min: priceMin,
    price_max: priceMax,
    area_sqft: num(raw.areaSqft ?? raw.area_sqft),
    configuration: String(raw.configuration ?? ""),
    verified: Boolean(raw.verified),
    status: String(raw.status ?? "ACTIVE"),
    primary_photo: toAbsoluteAssetUrl(rawPrimary) ?? rawPrimary,
    photo_count: num(raw.photoCount ?? raw.photo_count),
    view_count: num(raw.viewCount ?? raw.view_count),
    created_at: String(raw.createdAt ?? raw.created_at ?? ""),
    ...(raw.agentId || raw.agent_id
      ? { agent_id: String(raw.agentId ?? raw.agent_id) }
      : {}),
  };
}

type PageResponseRaw<T> = {
  content: T[];
  page: number;
  size: number;
  total: number;
};

function toPaginatedProperties(
  raw: PageResponseRaw<Record<string, unknown>>
): PaginatedResponse<PropertyListItem> {
  const totalPages =
    raw.size > 0 ? Math.max(1, Math.ceil(Number(raw.total) / raw.size)) : 1;
  return {
    data: raw.content.map((row) => normalizePropertyListItem(row)),
    pagination: {
      page: raw.page + 1,
      size: raw.size,
      total: Number(raw.total),
      total_pages: totalPages,
    },
  };
}

function buildPropertyQuery(params?: {
  city?: string;
  type?: string;
  priceMin?: number;
  priceMax?: number;
  page?: number;
  size?: number;
}): string {
  if (!params) return "";
  const p = new URLSearchParams();
  if (params.city) p.set("city", params.city);
  if (params.type) p.set("type", params.type);
  if (params.priceMin != null) p.set("price_min", String(params.priceMin));
  if (params.priceMax != null) p.set("price_max", String(params.priceMax));
  const pageZero =
    params.page != null ? Math.max(0, params.page - 1) : 0;
  p.set("page", String(pageZero));
  p.set("size", String(params.size ?? 20));
  const s = p.toString();
  return s ? `?${s}` : "";
}

// ——— AUTH ———

export type OtpSendResult = {
  success: boolean;
  message: string;
  devOtp?: string;
};

export async function sendOtp(phone: string): Promise<OtpSendResult> {
  const raw = await apiFetch<Record<string, unknown>>("/auth/otp/send", {
    method: "POST",
    body: { phone },
    auth: "none",
  });
  const devOtp =
    typeof raw.devOtp === "string"
      ? raw.devOtp
      : typeof (raw as { dev_otp?: unknown }).dev_otp === "string"
        ? String((raw as { dev_otp: string }).dev_otp)
        : undefined;
  return {
    success: Boolean(raw.success ?? true),
    message: String(raw.message ?? "OTP sent"),
    ...(devOtp ? { devOtp } : {}),
  };
}

export type VerifyOtpResponse = {
  token: string;
  role: string;
  userId: string;
  name: string;
};

export async function verifyOtp(
  phone: string,
  otp: string
): Promise<VerifyOtpResponse> {
  const raw = await apiFetch<Record<string, unknown>>("/auth/otp/verify", {
    method: "POST",
    body: { phone, otp },
    auth: "none",
  });
  return {
    token: String(raw.token ?? raw.access_token ?? ""),
    role: String(raw.role ?? ""),
    userId: String(raw.userId ?? raw.user_id ?? ""),
    name: String(raw.name ?? ""),
  };
}

export async function verifyFirebaseIdToken(idToken: string) {
  const raw = await apiFetch<Record<string, unknown>>("/auth/firebase/verify", {
    method: "POST",
    body: { idToken },
    auth: "none",
  });
  return {
    token: String(raw.token ?? raw.access_token ?? ""),
    role: String(raw.role ?? ""),
    userId: String(raw.userId ?? raw.user_id ?? ""),
    name: String(raw.name ?? ""),
  };
}

export async function passwordLogin(phone: string, password: string, role: "SELLER" | "AGENT") {
  const raw = await apiFetch<Record<string, unknown>>("/auth/password/login", {
    method: "POST",
    body: { phone, password, role },
    auth: "none",
  });
  return {
    token: String(raw.token ?? raw.access_token ?? ""),
    role: String(raw.role ?? ""),
    userId: String(raw.userId ?? raw.user_id ?? ""),
    name: String(raw.name ?? ""),
  };
}

export async function registerSellerAccount(data: {
  name: string;
  phone: string;
  password: string;
  preferredAgentId?: string | null;
  isAgent?: boolean;
}) {
  const raw = await apiFetch<Record<string, unknown>>("/auth/seller/register", {
    method: "POST",
    body: data,
    auth: "none",
  });
  return {
    token: String(raw.token ?? raw.access_token ?? ""),
    role: String(raw.role ?? ""),
    userId: String(raw.userId ?? raw.user_id ?? ""),
    name: String(raw.name ?? ""),
  };
}

export function sendBuyerOtp(phone: string) {
  return apiFetch("/buyers/otp/send", {
    method: "POST",
    body: { phone },
    auth: "none",
  });
}

export async function verifyBuyerOtp(phone: string, otp: string) {
  const raw = await apiFetch<Record<string, unknown>>("/buyers/otp/verify", {
    method: "POST",
    body: { phone, otp },
    auth: "none",
  });
  return {
    buyerToken: String(raw.buyerToken ?? raw.buyer_token ?? ""),
    buyerId: String(raw.buyerId ?? raw.buyer_id ?? ""),
  };
}

export async function adminLogin(email: string, password: string) {
  const raw = await apiFetch<Record<string, unknown>>("/admin/auth/login", {
    method: "POST",
    body: { email, password },
    auth: "none",
  });
  return {
    token: String(raw.token ?? raw.access_token ?? ""),
    role: String(raw.role ?? "ADMIN"),
    userId: String(raw.userId ?? raw.user_id ?? raw.admin_id ?? ""),
    name: String(raw.name ?? "Admin"),
  };
}

export async function adminRegister(data: {
  name: string;
  email: string;
  password: string;
  phone?: string;
  inviteSecret?: string;
}) {
  const raw = await apiFetch<Record<string, unknown>>("/admin/auth/register", {
    method: "POST",
    body: {
      name: data.name,
      email: data.email,
      password: data.password,
      ...(data.phone?.trim() ? { phone: data.phone.trim() } : {}),
      ...(data.inviteSecret?.trim()
        ? { inviteSecret: data.inviteSecret.trim() }
        : {}),
    },
    auth: "none",
  });
  return {
    token: String(raw.token ?? raw.access_token ?? ""),
    role: String(raw.role ?? "ADMIN"),
    userId: String(raw.userId ?? raw.user_id ?? ""),
    name: String(raw.name ?? data.name),
  };
}

// ——— PROPERTIES ———

export async function getProperties(params?: {
  city?: string;
  type?: string;
  priceMin?: number;
  priceMax?: number;
  page?: number;
  size?: number;
}): Promise<PaginatedResponse<PropertyListItem>> {
  const q = buildPropertyQuery({
    city: params?.city,
    type: params?.type,
    priceMin: params?.priceMin,
    priceMax: params?.priceMax,
    page: params?.page,
    size: params?.size ?? 20,
  });
  const raw = await apiFetch<PageResponseRaw<Record<string, unknown>>>(
    `/properties${q}`,
    { auth: "none" }
  );
  return toPaginatedProperties(raw);
}

export async function getFeaturedProperties(city?: string) {
  const q = city ? `?city=${encodeURIComponent(city)}` : "";
  const raw = await apiFetch<PageResponseRaw<Record<string, unknown>>>(
    `/properties/featured${q}`,
    { auth: "none" }
  );
  return toPaginatedProperties(raw);
}

function normalizeDetailPhotos(
  photosRaw: unknown
): import("../types").PropertyPhoto[] {
  if (!Array.isArray(photosRaw)) return [];
  const out: import("../types").PropertyPhoto[] = [];
  for (const row of photosRaw as Record<string, unknown>[]) {
    const url =
      (typeof row.url === "string" && row.url.trim()) ||
      (typeof row.storageUrl === "string" && row.storageUrl.trim()) ||
      (typeof row.storage_url === "string" && row.storage_url.trim()) ||
      "";
    if (!url) continue;
    const id = String(row.id ?? url);
    const isPrimary = Boolean(row.isPrimary ?? row.is_primary);
    const sortOrder =
      row.sortOrder != null
        ? num(row.sortOrder)
        : row.sort_order != null
          ? num(row.sort_order)
          : undefined;
    const photo: import("../types").PropertyPhoto = {
      id,
      url,
      is_primary: isPrimary,
    };
    if (sortOrder !== undefined) photo.sort_order = sortOrder;
    out.push(photo);
  }
  return out;
}

export async function getPropertyDetail(
  id: string,
  opts?: { suppressErrorToast?: boolean }
): Promise<import("../types").PropertyDetail> {
  const raw = await apiFetch<Record<string, unknown>>(
    `/properties/${encodeURIComponent(id)}`,
    { auth: "none", suppressErrorToast: opts?.suppressErrorToast ?? false }
  );
  const base = normalizePropertyListItem(raw);
  const photosRaw = raw.photos;
  let photos = normalizeDetailPhotos(photosRaw).map((p) => ({
    ...p,
    url: toAbsoluteAssetUrl(p.url) ?? p.url,
  }));
  const lat =
    raw.lat != null
      ? num(raw.lat, NaN)
      : raw.latitude != null
        ? num(raw.latitude, NaN)
        : NaN;
  const lng =
    raw.lng != null
      ? num(raw.lng, NaN)
      : raw.longitude != null
        ? num(raw.longitude, NaN)
        : NaN;
  const contactPhone =
    (typeof raw.contactPhone === "string" && raw.contactPhone.trim()) ||
    (typeof raw.contact_phone === "string" && raw.contact_phone.trim()) ||
    null;
  const possession =
    (raw.possession as string | null | undefined) ??
    (raw.possession_status as string | null | undefined) ??
    null;
  const primaryResolved =
    toAbsoluteAssetUrl(base.primary_photo ?? undefined) ?? base.primary_photo ?? null;
  if (photos.length === 0 && primaryResolved) {
    photos = [
      {
        id: "primary",
        url: primaryResolved,
        is_primary: true,
      },
    ];
  }
  return {
    ...base,
    description:
      (raw.description as string | null | undefined) ?? null,
    photos,
    floor: (raw.floor as string | null | undefined) ?? null,
    facing: (raw.facing as string | null | undefined) ?? null,
    property_code:
      (raw.propertyCode as string | null | undefined) ??
      (raw.property_code as string | null | undefined) ??
      null,
    bathrooms:
      raw.bathrooms != null ? num(raw.bathrooms) : null,
    possession_status: possession,
    latitude: Number.isFinite(lat) ? lat : null,
    longitude: Number.isFinite(lng) ? lng : null,
    contact_phone: contactPhone,
    primary_photo:
      primaryResolved ??
      (photos.length
        ? photos.find((p) => p.is_primary)?.url ?? photos[0]!.url
        : null),
  };
}

export async function searchProperties(
  q: string,
  city?: string,
  listOpts?: { page?: number; size?: number; suppressErrorToast?: boolean }
) {
  try {
    const qs = new URLSearchParams();
    qs.set("q", q);
    if (city) qs.set("city", city);
    if (listOpts?.page != null) qs.set("page", String(listOpts.page));
    if (listOpts?.size != null) qs.set("size", String(listOpts.size));
    const raw = await apiFetch<PageResponseRaw<Record<string, unknown>>>(
      `/properties/search?${qs.toString()}`,
      { auth: "none", suppressErrorToast: listOpts?.suppressErrorToast ?? false }
    );
    return toPaginatedProperties(raw);
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 405)) {
      const all = await getProperties({ city, size: 100 });
      const ql = q.trim().toLowerCase();
      const filtered = all.data.filter(
        (p) =>
          p.title.toLowerCase().includes(ql) ||
          p.locality.toLowerCase().includes(ql) ||
          p.city.toLowerCase().includes(ql) ||
          p.id.toLowerCase().includes(ql)
      );
      return {
        data: filtered,
        pagination: {
          page: 1,
          size: filtered.length,
          total: filtered.length,
          total_pages: 1,
        },
      };
    }
    throw e;
  }
}

export function createProperty(data: Record<string, unknown>) {
  return apiFetch(`/properties`, { method: "POST", body: data });
}

export async function recordPropertyView(
  id: string,
  sessionHash: string,
  city: string
) {
  const hash =
    sessionHash || (await ensureSessionHash()) || getSessionHash();
  try {
    await apiFetch(`/properties/${encodeURIComponent(id)}/view`, {
      method: "POST",
      body: { sessionHash: hash, city },
      auth: "none",
      suppressErrorToast: true,
    });
  } catch {
    /* best-effort analytics */
  }
}

export async function getWhatsAppLink(propertyId: string, sessionHash: string) {
  const hash =
    sessionHash || (await ensureSessionHash()) || getSessionHash();
  const raw = await apiFetch<Record<string, string>>(
    `/whatsapp/link/${encodeURIComponent(propertyId)}?sessionHash=${encodeURIComponent(hash)}`,
    { auth: "none" }
  );
  const wa_url = raw.wa_url ?? raw.waUrl ?? "";
  return { wa_url };
}

// ——— LEADS ———

export function logLead(data: {
  propertyId: string;
  actionType: string;
  sessionHash: string;
  city?: string;
  buyerPhone?: string;
}) {
  return apiFetch("/leads", { method: "POST", body: data, auth: "none" });
}

export function getSellerLeadSummary() {
  return apiFetch("/leads/seller");
}

// ——— VISITS ———

export function scheduleVisit(data: {
  propertyId: string;
  visitDate: string;
  visitTime: string;
  buyerPhone: string;
}) {
  return apiFetch("/visits", { method: "POST", body: data, auth: "none" });
}

export function getAgentVisits(date?: string, status?: string) {
  const p = new URLSearchParams();
  if (date) p.set("date", date);
  if (status) p.set("status", status);
  const qs = p.toString();
  return apiFetch<unknown[]>(`/visits${qs ? `?${qs}` : ""}`);
}

export function updateVisitStatus(
  id: string,
  status: string,
  notes?: string
) {
  return apiFetch(`/visits/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    body: { status, notes },
  });
}

export function rescheduleVisit(
  id: string,
  visitDate: string,
  visitTime: string
) {
  return apiFetch(`/visits/${encodeURIComponent(id)}/reschedule`, {
    method: "PATCH",
    body: { visitDate, visitTime },
  });
}

// ——— SAVED ———

export function saveProperty(propertyId: string) {
  return apiFetch("/saved", {
    method: "POST",
    body: { propertyId },
    auth: "buyer",
  });
}

export function removeSaved(propertyId: string) {
  return apiFetch(`/saved/${encodeURIComponent(propertyId)}`, {
    method: "DELETE",
    auth: "buyer",
  });
}

export function getSavedListings() {
  return apiFetch<unknown[]>("/saved", { auth: "buyer" });
}

// ——— PUBLIC SITE CONFIG ———

export type PublicSiteConfig = {
  enquiryPhone?: string | null;
};

export function getPublicSiteConfig() {
  return apiFetch<PublicSiteConfig>("/config/site", { auth: "none" });
}

// ——— NOTIFY ME ———

export function registerNotifyMe(phone: string, city: string) {
  return apiFetch("/notify-me", {
    method: "POST",
    body: { phone, city },
    auth: "none",
  });
}

// ——— SELLER ———

export function getSellerDashboard() {
  return apiFetch<Record<string, unknown>>("/sellers/me/dashboard");
}

export function getSellerMe() {
  return apiFetch<Record<string, unknown>>("/sellers/me");
}

export async function getSellerListings() {
  const raw = await apiFetch<unknown>("/sellers/me/listings");
  const arr = Array.isArray(raw) ? raw : [];
  return (arr as Record<string, unknown>[]).map((r) =>
    normalizePropertyListItem(r)
  );
}

export async function getSellerVisits() {
  const raw = await apiFetch<unknown>("/sellers/me/visits");
  return Array.isArray(raw) ? (raw as Record<string, unknown>[]) : [];
}

export function updatePropertyStatus(id: string, status: string) {
  return apiFetch(`/properties/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    body: { status },
  });
}

// ——— AGENT ———

export function getAgentDashboard() {
  return apiFetch<Record<string, unknown>>("/agents/me/dashboard");
}

export async function getAgentLeads() {
  const raw = await apiFetch<PageResponseRaw<Record<string, unknown>> | unknown[]>(
    "/leads"
  );
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object" && "content" in raw) {
    return (raw as PageResponseRaw<Record<string, unknown>>).content;
  }
  return [];
}

// ——— ADMIN ———

export function adminGetVisits(params?: { page?: number; size?: number }) {
  const p = new URLSearchParams();
  if (params?.page != null) p.set("page", String(params.page));
  if (params?.size != null) p.set("size", String(params.size));
  const qs = p.toString();
  return apiFetch<PageResponseRaw<Record<string, unknown>>>(
    `/admin/visits${qs ? `?${qs}` : ""}`
  );
}

export function adminUpdateVisitStatus(
  visitId: string,
  body: { status: string; notes?: string | null }
) {
  return apiFetch<Record<string, unknown>>(
    `/admin/visits/${encodeURIComponent(visitId)}/status`,
    {
      method: "PATCH",
      body: {
        status: body.status,
        ...(body.notes != null && body.notes !== ""
          ? { notes: body.notes }
          : {}),
      },
    }
  );
}

/** UTF-8 CSV with BOM — opens in Microsoft Excel. */
export async function adminDownloadVisitsCsv(
  params: { dateFrom: string; dateTo: string },
  opts?: { token?: string | null }
): Promise<{ blob: Blob; filename: string }> {
  const qs = new URLSearchParams({
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
  });
  const token =
    (opts?.token != null && String(opts.token).trim() !== ""
      ? String(opts.token).trim()
      : null) ??
    getToken() ??
    (typeof window !== "undefined" ? useAuthStore.getState().token : null);
  const url = `${BASE_URL}/admin/export/visits?${qs.toString()}`;
  const res = await fetch(url, {
    method: "GET",
    mode: "cors",
    cache: "no-store",
    headers: {
      Accept: "text/csv,application/octet-stream,*/*",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let message = text.trim() || `Export failed (${res.status})`;
    try {
      const j = JSON.parse(text) as { message?: string };
      if (j && typeof j.message === "string" && j.message.trim()) {
        message = j.message.trim();
      }
    } catch {
      /* plain text or HTML */
    }
    if (res.status === 401 || res.status === 403) {
      useAuthStore.getState().logout();
      if (typeof window !== "undefined") {
        window.location.href = "/admin/login";
      }
    }
    throw new ApiError(res.status, text, message);
  }
  const blob = await res.blob();
  const defaultName = `listmynest_visits_${params.dateFrom}_to_${params.dateTo}.csv`;
  let filename = defaultName;
  const cd = res.headers.get("Content-Disposition");
  if (cd) {
    const utf8 = /filename\*=UTF-8''([^;\s]+)/i.exec(cd);
    const quoted = /filename="([^"]+)"/i.exec(cd);
    const plain = /filename=([^;\s"]+)/i.exec(cd);
    const raw = utf8?.[1] ?? quoted?.[1] ?? plain?.[1];
    if (raw) {
      try {
        filename = decodeURIComponent(raw.replace(/"/g, ""));
      } catch {
        filename = raw.replace(/"/g, "");
      }
    }
  }
  const safe =
    filename.trim().endsWith(".csv") ? filename.trim() : `${filename.trim()}.csv`;
  return { blob, filename: safe };
}

export function adminGetProperties(params?: Record<string, string | number>) {
  const qs =
    params && Object.keys(params).length
      ? `?${new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v !== undefined && v !== "")
            .map(([k, v]) => [k, String(v)])
        ).toString()}`
      : "";
  return apiFetch<PageResponseRaw<Record<string, unknown>>>(
    `/admin/properties${qs}`
  );
}

export function adminGetPropertyDetail(id: string) {
  return apiFetch<Record<string, unknown>>(
    `/admin/properties/${encodeURIComponent(id)}`
  );
}

export async function adminGetAgents() {
  const raw = await apiFetch<PageResponseRaw<Record<string, unknown>>>(
    "/admin/agents"
  );
  return raw.content;
}

export async function adminGetSellers() {
  const raw = await apiFetch<PageResponseRaw<Record<string, unknown>>>(
    "/admin/sellers"
  );
  return raw.content;
}

export function adminCreateAgent(data: {
  name: string;
  phone: string;
  whatsappNumber: string;
  assignedCities: string[] | string;
  password: string;
}) {
  const assignedCities =
    typeof data.assignedCities === "string"
      ? data.assignedCities
      : data.assignedCities.join(",");
  return apiFetch("/admin/agents", {
    method: "POST",
    body: {
      name: data.name,
      phone: data.phone,
      whatsappNumber: data.whatsappNumber,
      assignedCities,
      password: data.password,
    },
  });
}

export function adminCreateSeller(data: { name: string; phone: string; password: string }) {
  return apiFetch("/admin/sellers", { method: "POST", body: data });
}

export function adminActivateListing(id: string) {
  return apiFetch(`/admin/properties/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    body: { status: "ACTIVE" },
  });
}

export function adminRejectListing(id: string) {
  return apiFetch(`/admin/properties/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    body: { status: "INACTIVE" },
  });
}

// ——— PHOTOS (seller) ———

export function getPhotoUploadUrl(propertyId: string, fileName: string) {
  return apiFetch<{ uploadUrl?: string; upload_url?: string; storagePath?: string; storage_path?: string }>(
    `/properties/${encodeURIComponent(propertyId)}/photos/upload-url`,
    { method: "POST", body: { fileName } }
  );
}

export function registerPropertyPhoto(
  propertyId: string,
  body: { storageUrl: string; isPrimary?: boolean }
) {
  return apiFetch(`/properties/${encodeURIComponent(propertyId)}/photos`, {
    method: "POST",
    body: {
      storageUrl: body.storageUrl,
      isPrimary: body.isPrimary ?? false,
    },
  });
}
