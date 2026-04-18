import type { NotifyMePayload, NotifyMeResponse } from "../../types";
import { apiRequest } from "./client";

/**
 * Register for city-level listing alerts (TRD: public; README optional buyer token).
 */
export function registerNotifyMe(
  payload: NotifyMePayload,
  buyerToken?: string
): Promise<NotifyMeResponse> {
  return apiRequest<NotifyMeResponse>("/notify-me", {
    method: "POST",
    body: payload,
    ...(buyerToken ? { token: buyerToken } : {}),
  });
}
