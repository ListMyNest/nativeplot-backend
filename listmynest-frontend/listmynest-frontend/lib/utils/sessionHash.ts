/**
 * Session hash = SHA-256(userAgent + date + screenSize) — no PII (workspace rules).
 */
export async function computeSessionHash(): Promise<string> {
  if (typeof window === "undefined") {
    return "ssr";
  }
  const day = new Date().toDateString();
  const screenSize = `${window.screen?.width ?? 0}x${window.screen?.height ?? 0}`;
  const payload = `${navigator.userAgent}|${day}|${screenSize}`;
  const data = new TextEncoder().encode(payload);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
