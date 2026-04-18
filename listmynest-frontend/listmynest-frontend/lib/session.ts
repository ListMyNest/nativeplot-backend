/**
 * Session hash: SHA-256(userAgent + Date.now + random), persisted in sessionStorage.
 */

const KEY = "lmn_session";

function fallbackSessionId(): string {
  const r =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  return `lmn_${r.replace(/-/g, "")}`;
}

async function computeHash(): Promise<string> {
  const payload = `${navigator.userAgent}${Date.now()}${Math.random()}`;
  const data = new TextEncoder().encode(payload);
  if (typeof crypto === "undefined" || !crypto.subtle) {
    return fallbackSessionId();
  }
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Ensures a stable session hash exists (call once from client bootstrap).
 */
export async function ensureSessionHash(): Promise<string> {
  if (typeof window === "undefined") return "";
  const existing = sessionStorage.getItem(KEY);
  if (existing && existing.trim()) return existing;
  try {
    const hash = await computeHash();
    const h = hash.trim() || fallbackSessionId();
    sessionStorage.setItem(KEY, h);
    return h;
  } catch {
    const h = fallbackSessionId();
    try {
      sessionStorage.setItem(KEY, h);
    } catch {
      /* private mode */
    }
    return h;
  }
}

/**
 * Returns stored session hash, or empty string if not yet initialized.
 */
export function getSessionHash(): string {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem(KEY) ?? "";
}
