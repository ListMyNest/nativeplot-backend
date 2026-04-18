/**
 * Lead endpoints — `fetch` via {@link apiRequest} + `NEXT_PUBLIC_API_BASE_URL`.
 */
import type { CreateLeadPayload, Lead, LeadListQuery } from "../../types";
import { apiRequest } from "./client";

export function createLead(payload: CreateLeadPayload): Promise<Lead> {
  return apiRequest<Lead>("/leads", {
    method: "POST",
    body: payload,
  });
}

export function listAgentLeads(
  token: string,
  query?: LeadListQuery
): Promise<Lead[]> {
  return apiRequest<Lead[]>("/leads", { token, query });
}

export function getSellerLeadSummary(token: string): Promise<unknown> {
  return apiRequest<unknown>("/leads/seller", { token });
}
