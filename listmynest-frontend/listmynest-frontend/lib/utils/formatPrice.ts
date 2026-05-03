/**
 * Sale / land prices: API stores **rupees** in DB; we show **₹… Lakh** (÷ 1,00,000).
 * Used for: RESIDENTIAL, PLOT, AGRICULTURAL, COMMERCIAL, and all non-rent types.
 */
export function formatPriceRangeLakh(min: number, max: number): string {
  const lakh = (n: number) => n / 100_000;
  const fmt = (n: number) => {
    const v = lakh(n);
    const rounded = Math.round(v * 10) / 10;
    return Number.isInteger(rounded)
      ? String(rounded)
      : rounded.toFixed(1).replace(/\.0$/, "");
  };
  return `₹${fmt(min)} – ₹${fmt(max)} Lakh`;
}

/** RENT_HOME / RENT_COMMERCIAL — backend stores monthly rent in rupees (not lakhs). */
export function isRentPropertyType(type: unknown): boolean {
  const t = String(type ?? "").toUpperCase();
  return t === "RENT" || t.startsWith("RENT_");
}

/**
 * Rent listings on cards/search: show ₹10,000 not ₹0.1 Lakh (amounts are rupees).
 */
export function formatPriceRangeRentRupees(min: number, max: number): string {
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(
      Math.round(n)
    );
  const a = Math.round(min);
  const b = Math.round(max);
  if (a === b) return `₹${fmt(min)}`;
  return `₹${fmt(min)} – ₹${fmt(max)}`;
}

/**
 * Public UI price line:
 * - **Rent** (`RENT`, `RENT_HOME`, `RENT_COMMERCIAL`, …): show **rupees** as stored (e.g. ₹10,000).
 * - **Plots, agricultural, residential, commercial, etc.**: show **lakhs** from DB rupees (e.g. ₹25 Lakh).
 */
export function formatBuyerPriceRange(
  min: number,
  max: number,
  type: unknown
): string {
  if (isRentPropertyType(type)) {
    return formatPriceRangeRentRupees(min, max);
  }
  return formatPriceRangeLakh(min, max);
}
