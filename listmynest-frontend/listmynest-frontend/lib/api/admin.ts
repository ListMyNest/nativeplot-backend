import type {
  AdminAuditLogQuery,
  AdminPropertyQuery,
  AdminPatchPropertyStatusPayload,
  AgentMeProfile,
  CreateAdminAgentPayload,
  CreateAdminSellerPayload,
  ImpersonateSellerResponse,
  PaginatedResponse,
  PatchAdminAgentPayload,
  PropertyDetail,
  PropertyListItem,
} from "../../types";
import { apiRequest } from "./client";

export function listAdminProperties(
  token: string,
  query?: AdminPropertyQuery
): Promise<PaginatedResponse<PropertyListItem>> {
  return apiRequest<PaginatedResponse<PropertyListItem>>("/admin/properties", {
    token,
    query,
  });
}

export function patchAdminPropertyStatus(
  token: string,
  propertyId: string,
  payload: AdminPatchPropertyStatusPayload
): Promise<PropertyDetail> {
  return apiRequest<PropertyDetail>(
    `/admin/properties/${encodeURIComponent(propertyId)}/status`,
    {
      method: "PATCH",
      token,
      body: payload,
    }
  );
}

export function listAdminAgents(token: string): Promise<AgentMeProfile[]> {
  return apiRequest<AgentMeProfile[]>("/admin/agents", { token });
}

export function createAdminAgent(
  token: string,
  payload: CreateAdminAgentPayload
): Promise<AgentMeProfile> {
  return apiRequest<AgentMeProfile>("/admin/agents", {
    method: "POST",
    token,
    body: payload,
  });
}

export function patchAdminAgent(
  token: string,
  agentId: string,
  payload: PatchAdminAgentPayload
): Promise<AgentMeProfile> {
  return apiRequest<AgentMeProfile>(
    `/admin/agents/${encodeURIComponent(agentId)}`,
    {
      method: "PATCH",
      token,
      body: payload,
    }
  );
}

export function listAdminSellers(token: string): Promise<unknown[]> {
  return apiRequest<unknown[]>("/admin/sellers", { token });
}

export function createAdminSeller(
  token: string,
  payload: CreateAdminSellerPayload
): Promise<unknown> {
  return apiRequest<unknown>("/admin/sellers", {
    method: "POST",
    token,
    body: payload,
  });
}

export function impersonateSeller(
  token: string,
  sellerId: string
): Promise<ImpersonateSellerResponse> {
  return apiRequest<ImpersonateSellerResponse>(
    `/admin/impersonate/seller/${encodeURIComponent(sellerId)}`,
    { method: "POST", token }
  );
}

export function listAdminBuyers(token: string): Promise<unknown[]> {
  return apiRequest<unknown[]>("/admin/buyers", { token });
}

export function getAdminAuditLog(
  token: string,
  query?: AdminAuditLogQuery
): Promise<unknown[]> {
  return apiRequest<unknown[]>("/admin/audit-log", { token, query });
}
