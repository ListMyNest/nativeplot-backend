import type { Lead } from "../../types";
import { apiRequest } from "./client";

/** GET /leads/seller — normalised to an array for dashboard UI. */
export async function getSellerEnquiries(token: string): Promise<Lead[]> {
  const raw = await apiRequest<unknown>("/leads/seller", { token });
  if (Array.isArray(raw)) return raw as Lead[];
  if (
    raw &&
    typeof raw === "object" &&
    "data" in raw &&
    Array.isArray((raw as { data: unknown }).data)
  ) {
    return (raw as { data: Lead[] }).data;
  }
  if (
    raw &&
    typeof raw === "object" &&
    "enquiries" in raw &&
    Array.isArray((raw as { enquiries: unknown }).enquiries)
  ) {
    return (raw as { enquiries: Lead[] }).enquiries;
  }
  return [];
}
