"use client";

import {
  buildTelHref,
  buildWhatsAppHref,
} from "../../lib/enquiryContact";
import { useEnquiryContact } from "../../hooks/useEnquiryContact";

const WA_PREFILL =
  "Hello ListMyNest, I need help finding a property.";

export function EnquiryBanner() {
  const raw = useEnquiryContact();
  const tel = buildTelHref(raw);
  const wa = buildWhatsAppHref(raw, WA_PREFILL);

  return (
    <section className="px-4 sm:px-6" aria-labelledby="enquiry-banner-title">
      <div className="flex flex-col gap-4 rounded-2xl border border-red-100 bg-red-50 p-4 shadow-sm">
        <div>
          <h2
            id="enquiry-banner-title"
            className="text-lg font-bold text-lmn-dark"
          >
            Can&apos;t find what you need?
          </h2>
          <p className="mt-1 text-sm text-lmn-muted">
            Tell us your requirement
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {tel ? (
            <a
              href={tel}
              className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-lmn-primary text-center text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lmn-primary focus-visible:ring-offset-2"
            >
              <span aria-hidden>📞</span>
              Call Us
            </a>
          ) : (
            <span className="flex min-h-[48px] cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-lmn-primary/40 text-center text-sm font-semibold text-white">
              <span aria-hidden>📞</span>
              Call Us
            </span>
          )}
          {wa ? (
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-lmn-whatsapp text-center text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lmn-whatsapp focus-visible:ring-offset-2"
            >
              <span aria-hidden>💬</span>
              WhatsApp Us
            </a>
          ) : (
            <span className="flex min-h-[48px] cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-lmn-whatsapp/40 text-center text-sm font-semibold text-white">
              <span aria-hidden>💬</span>
              WhatsApp Us
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
