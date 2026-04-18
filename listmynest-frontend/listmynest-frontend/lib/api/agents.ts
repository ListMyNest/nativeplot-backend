import type {
  AgentDashboard,
  AgentFcmTokenPayload,
  AgentMeProfile,
  AgentStatusPayload,
} from "../../types";
import { apiRequest } from "./client";

export function getAgentMe(token: string): Promise<AgentMeProfile> {
  return apiRequest<AgentMeProfile>("/agents/me", { token });
}

export function patchAgentStatus(
  token: string,
  payload: AgentStatusPayload
): Promise<AgentMeProfile> {
  return apiRequest<AgentMeProfile>("/agents/me/status", {
    method: "PATCH",
    token,
    body: payload,
  });
}

export function patchAgentFcmToken(
  token: string,
  payload: AgentFcmTokenPayload
): Promise<void> {
  return apiRequest<void>("/agents/me/fcm-token", {
    method: "PATCH",
    token,
    body: payload,
  });
}

export function getAgentDashboard(token: string): Promise<AgentDashboard> {
  return apiRequest<AgentDashboard>("/agents/me/dashboard", { token });
}
