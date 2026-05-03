/**
 * Labels for buyer-facing property chips (cards, detail).
 * Java enums use names like {@code _2BHK}; UI shows conventional wording.
 */

/** Plot / farm listings — BHK and bathrooms are not meaningful. */
export function isLandOrAgriculturalType(type: unknown): boolean {
  const t = String(type ?? "").toUpperCase();
  return t === "PLOT" || t === "PLOTS" || t === "AGRICULTURAL";
}

/** Built/RFS metrics (BHK, baths) apply to structures, not vacant land or farmland. */
export function showBuiltStructureMetrics(type: unknown): boolean {
  return !isLandOrAgriculturalType(type);
}

/**
 * Maps API enum values ({@code _2BHK}, {@code OPEN}) to readable chip text.
 */
export function formatConfigurationLabel(raw: string | null | undefined): string {
  if (raw == null || !String(raw).trim()) return "—";
  const u = String(raw).trim().toUpperCase().replace(/^_/, "");
  if (u === "1BHK") return "1 BHK";
  if (u === "2BHK") return "2 BHK";
  if (u === "3BHK") return "3 BHK";
  if (u === "OPEN") return "Open floor";
  const m = /^(\d)BHK$/i.exec(u);
  if (m) return `${m[1]} BHK`;
  return String(raw).trim().replace(/^_/, "");
}

export function formatBathChipLabel(
  bathrooms: number | null | undefined
): string | null {
  if (bathrooms == null || bathrooms <= 0) return null;
  return `${bathrooms} Bath`;
}
