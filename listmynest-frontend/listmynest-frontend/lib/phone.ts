/** 10-digit national part → E.164 India */
export function digitsToIndiaE164(digits: string): string {
  const d = digits.replace(/\D/g, "").slice(0, 10);
  return `+91${d}`;
}

export function isTenIndiaDigits(digits: string): boolean {
  return digits.replace(/\D/g, "").length === 10;
}
