/**
 * Property endpoints — all requests use `fetch` via {@link apiRequest} against
 * `process.env.NEXT_PUBLIC_API_BASE_URL` (see `lib/api/client.ts`).
 */
import type {
  PaginatedResponse,
  PhotoUploadUrlResponse,
  PropertyDetail,
  PropertyListItem,
  PropertyListQuery,
  PropertySearchQuery,
  RecordPropertyViewPayload,
  RegisterPhotoPayload,
  CreatePropertyPayload,
  UpdatePropertyPayload,
  UpdatePropertyStatusPayload,
} from "../../types";
import { apiRequest } from "./client";

export function listProperties(
  query?: PropertyListQuery
): Promise<PaginatedResponse<PropertyListItem>> {
  return apiRequest<PaginatedResponse<PropertyListItem>>("/properties", {
    query,
  });
}

export function getProperty(id: string): Promise<PropertyDetail> {
  return apiRequest<PropertyDetail>(`/properties/${encodeURIComponent(id)}`);
}

export function getFeaturedProperties(
  query?: Pick<PropertyListQuery, "city" | "page" | "size">
): Promise<PaginatedResponse<PropertyListItem>> {
  return apiRequest<PaginatedResponse<PropertyListItem>>(
    "/properties/featured",
    { query }
  );
}

export function searchProperties(
  query: PropertySearchQuery
): Promise<PaginatedResponse<PropertyListItem>> {
  return apiRequest<PaginatedResponse<PropertyListItem>>(
    "/properties/search",
    { query }
  );
}

export function createProperty(
  token: string,
  payload: CreatePropertyPayload
): Promise<PropertyDetail> {
  return apiRequest<PropertyDetail>("/properties", {
    method: "POST",
    token,
    body: payload,
  });
}

export function updateProperty(
  token: string,
  id: string,
  payload: UpdatePropertyPayload
): Promise<PropertyDetail> {
  return apiRequest<PropertyDetail>(
    `/properties/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      token,
      body: payload,
    }
  );
}

export function patchPropertyStatus(
  token: string,
  id: string,
  payload: UpdatePropertyStatusPayload
): Promise<PropertyDetail> {
  return apiRequest<PropertyDetail>(
    `/properties/${encodeURIComponent(id)}/status`,
    {
      method: "PATCH",
      token,
      body: payload,
    }
  );
}

export function deleteProperty(token: string, id: string): Promise<void> {
  return apiRequest<void>(`/properties/${encodeURIComponent(id)}`, {
    method: "DELETE",
    token,
  });
}

export function markPropertySold(token: string, id: string): Promise<void> {
  return apiRequest<void>(
    `/properties/${encodeURIComponent(id)}/sold`,
    {
      method: "PATCH",
      token,
      body: {},
    }
  );
}

export function recordPropertyView(
  id: string,
  payload: RecordPropertyViewPayload
): Promise<void> {
  return apiRequest<void>(
    `/properties/${encodeURIComponent(id)}/view`,
    {
      method: "POST",
      body: payload,
    }
  );
}

export function getPhotoUploadUrl(
  token: string,
  propertyId: string
): Promise<PhotoUploadUrlResponse> {
  return apiRequest<PhotoUploadUrlResponse>(
    `/properties/${encodeURIComponent(propertyId)}/photos/upload-url`,
    { method: "POST", token }
  );
}

export function registerPropertyPhoto(
  token: string,
  propertyId: string,
  payload: RegisterPhotoPayload
): Promise<{ id: string }> {
  return apiRequest<{ id: string }>(
    `/properties/${encodeURIComponent(propertyId)}/photos`,
    { method: "POST", token, body: payload }
  );
}

export function deletePropertyPhoto(
  token: string,
  propertyId: string,
  photoId: string
): Promise<void> {
  return apiRequest<void>(
    `/properties/${encodeURIComponent(propertyId)}/photos/${encodeURIComponent(photoId)}`,
    { method: "DELETE", token }
  );
}

export function setPrimaryPropertyPhoto(
  token: string,
  propertyId: string,
  photoId: string
): Promise<void> {
  return apiRequest<void>(
    `/properties/${encodeURIComponent(propertyId)}/photos/${encodeURIComponent(photoId)}/primary`,
    { method: "PATCH", token }
  );
}
