/**
 * Display price range in ₹ Lakh (README — never exact single price in marketing copy).
 * API amounts are assumed to be rupees (e.g. 1_800_000 → 18 Lakh).
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
