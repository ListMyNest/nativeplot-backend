import type { WhatsAppLinkResponse } from "../../types";
import { apiRequest } from "./client";

/**
 * Returns the wa.me (or equivalent) URL for the assigned agent.
 * Call only after POST /leads with WHATSAPP (anti-bypass).
 */
export function getWhatsAppLink(propertyId: string): Promise<WhatsAppLinkResponse> {
  return apiRequest<WhatsAppLinkResponse>(
    `/whatsapp/link/${encodeURIComponent(propertyId)}`
  );
}
