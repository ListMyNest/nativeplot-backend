/** E.164-style input → digits only for wa.me (country code included, no +). */
export function internationalDigitsForLinks(raw: string): string | null {
  const d = raw.replace(/\D/g, "");
  if (d.length === 10) {
    return `91${d}`;
  }
  if (d.length >= 11 && d.length <= 15) {
    return d;
  }
  return null;
}

export function enquiryPhoneFromEnv(): string | null {
  const a = process.env.NEXT_PUBLIC_ENQUIRY_PHONE?.trim();
  if (a) return a;
  const b = process.env.NEXT_PUBLIC_FALLBACK_BUYER_CONTACT_PHONE?.trim();
  if (b) return b;
  return null;
}

export function buildTelHref(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const digits = internationalDigitsForLinks(raw.trim());
  if (!digits) return null;
  return `tel:+${digits}`;
}

export function buildWhatsAppHref(
  raw: string | null | undefined,
  prefill: string
): string | null {
  if (!raw?.trim()) return null;
  const digits = internationalDigitsForLinks(raw.trim());
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(prefill)}`;
}
