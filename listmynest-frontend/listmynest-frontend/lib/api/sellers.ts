import type {
  PaginatedResponse,
  PropertyListItem,
  SellerDashboard,
  SellerMeProfile,
} from "../../types";
import { apiRequest } from "./client";

export function getSellerMe(token: string): Promise<SellerMeProfile> {
  return apiRequest<SellerMeProfile>("/sellers/me", { token });
}

export function getSellerDashboard(token: string): Promise<SellerDashboard> {
  return apiRequest<SellerDashboard>("/sellers/me/dashboard", { token });
}

export function getSellerListings(
  token: string
): Promise<PaginatedResponse<PropertyListItem>> {
  return apiRequest<PaginatedResponse<PropertyListItem>>(
    "/sellers/me/listings",
    { token }
  );
}
