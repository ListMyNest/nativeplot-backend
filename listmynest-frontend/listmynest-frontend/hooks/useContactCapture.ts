"use client";

import { useCallback, useRef, useState } from "react";

import { getWhatsAppLink, logLead } from "../lib/api";
import { ensureSessionHash, getSessionHash } from "../lib/session";
import { useSessionStore } from "../store/sessionStore";

type UseContactCaptureArgs = {
  propertyId: string;
  city: string;
};

const PLACEHOLDER_CALL_TEL = "tel:+919876543210";

/**
 * Contact capture: log lead then open WhatsApp / dialer.
 */
export function useContactCapture({ propertyId, city }: UseContactCaptureArgs) {
  const setContactActionTaken = useSessionStore((s) => s.setContactActionTaken);
  const [pending, setPending] = useState<"call" | "whatsapp" | null>(null);
  const busyRef = useRef(false);

  const triggerWhatsApp = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setPending("whatsapp");
    try {
      const sessionHash = (await ensureSessionHash()) || getSessionHash();
      await logLead({
        propertyId,
        actionType: "WHATSAPP",
        sessionHash,
        city,
      });
      setContactActionTaken(true);
      const { wa_url } = await getWhatsAppLink(propertyId, sessionHash);
      if (wa_url) window.open(wa_url, "_blank", "noopener,noreferrer");
    } catch {
      window.alert("Could not open WhatsApp. Please try again.");
    } finally {
      busyRef.current = false;
      setPending(null);
    }
  }, [propertyId, city, setContactActionTaken]);

  const triggerCall = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setPending("call");
    try {
      const sessionHash = (await ensureSessionHash()) || getSessionHash();
      await logLead({
        propertyId,
        actionType: "CALL",
        sessionHash,
        city,
      });
      setContactActionTaken(true);
      window.location.href = PLACEHOLDER_CALL_TEL;
    } catch {
      window.alert("Could not start the call. Please try again.");
    } finally {
      busyRef.current = false;
      setPending(null);
    }
  }, [propertyId, city, setContactActionTaken]);

  return {
    triggerCall,
    triggerWhatsApp,
    pendingCall: pending === "call",
    pendingWhatsApp: pending === "whatsapp",
  };
}
