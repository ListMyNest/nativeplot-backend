import type {
  RescheduleVisitPayload,
  ScheduleVisitPayload,
  UpdateVisitStatusPayload,
  Visit,
  VisitListQuery,
} from "../../types";
import { apiRequest } from "./client";

export function scheduleVisit(payload: ScheduleVisitPayload): Promise<Visit> {
  return apiRequest<Visit>("/visits", {
    method: "POST",
    body: payload,
  });
}

export function listAgentVisits(
  token: string,
  query?: VisitListQuery
): Promise<Visit[]> {
  return apiRequest<Visit[]>("/visits", { token, query });
}

export function updateVisitStatus(
  token: string,
  visitId: string,
  payload: UpdateVisitStatusPayload
): Promise<Visit> {
  return apiRequest<Visit>(
    `/visits/${encodeURIComponent(visitId)}/status`,
    {
      method: "PATCH",
      token,
      body: payload,
    }
  );
}

export function rescheduleVisit(
  token: string,
  visitId: string,
  payload: RescheduleVisitPayload
): Promise<Visit> {
  return apiRequest<Visit>(
    `/visits/${encodeURIComponent(visitId)}/reschedule`,
    {
      method: "PATCH",
      token,
      body: payload,
    }
  );
}
