"use client";

import { useEffect, useState } from "react";

import { getPublicSiteConfig } from "../lib/api";
import { enquiryPhoneFromEnv } from "../lib/enquiryContact";

/**
 * Phone for homepage Call / WhatsApp: NEXT_PUBLIC_* first, else GET /v1/config/site (backend FALLBACK_BUYER_CONTACT_PHONE).
 */
export function useEnquiryContact(): string | null {
  const [raw, setRaw] = useState<string | null>(() => enquiryPhoneFromEnv());

  useEffect(() => {
    if (raw) return;
    let cancelled = false;
    void getPublicSiteConfig()
      .then((c) => {
        const p = c.enquiryPhone?.trim();
        if (!cancelled && p) setRaw(p);
      })
      .catch(() => {
        /* ignore */
      });
    return () => {
      cancelled = true;
    };
  }, [raw]);

  return raw;
}
