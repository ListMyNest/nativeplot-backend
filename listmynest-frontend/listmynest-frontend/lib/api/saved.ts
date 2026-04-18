import type { SaveListingPayload, SavedListing } from "../../types";
import { apiRequest } from "./client";

export function saveListing(
  buyerToken: string,
  payload: SaveListingPayload
): Promise<SavedListing> {
  return apiRequest<SavedListing>("/saved", {
    method: "POST",
    token: buyerToken,
    body: payload,
  });
}

export function unsaveListing(
  buyerToken: string,
  propertyId: string
): Promise<void> {
  return apiRequest<void>(`/saved/${encodeURIComponent(propertyId)}`, {
    method: "DELETE",
    token: buyerToken,
  });
}

export function listSavedListings(buyerToken: string): Promise<SavedListing[]> {
  return apiRequest<SavedListing[]>("/saved", { token: buyerToken });
}
