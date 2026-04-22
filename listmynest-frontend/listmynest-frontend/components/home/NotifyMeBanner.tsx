"use client";

import { buildWhatsAppHref } from "../../lib/enquiryContact";
import { useEnquiryContact } from "../../hooks/useEnquiryContact";

const WA_PREFILL =
  "Hi ListMyNest — please notify me about new properties in my area.";

export function NotifyMeBanner() {
  const raw = useEnquiryContact();
  const wa = buildWhatsAppHref(raw, WA_PREFILL);

  return (
    <section className="px-4 sm:px-6" aria-labelledby="notify-banner-title">
      <div className="rounded-2xl border border-lmn-border bg-white p-4 shadow-sm">
        <h2
          id="notify-banner-title"
          className="text-base font-extrabold text-lmn-dark"
        >
          🔔 New properties every week
        </h2>
        <p className="mt-1 text-sm text-lmn-muted">
          Get notified on WhatsApp — no spam
        </p>
        {wa ? (
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex min-h-[48px] w-full items-center justify-center rounded-xl bg-lmn-whatsapp text-center text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lmn-whatsapp focus-visible:ring-offset-2"
          >
            Notify Me on WhatsApp
          </a>
        ) : (
          <button
            type="button"
            onClick={() =>
              window.alert(
                "Enquiry phone not configured. Set NEXT_PUBLIC_ENQUIRY_PHONE in listmynest-frontend/listmynest-frontend/.env.local (then restart dev server)."
              )
            }
            className="mt-4 flex min-h-[48px] w-full items-center justify-center rounded-xl bg-lmn-whatsapp/40 text-center text-sm font-semibold text-white"
          >
            Notify Me on WhatsApp
          </button>
        )}
      </div>
    </section>
  );
}
