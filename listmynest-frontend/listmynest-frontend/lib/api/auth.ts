/**
 * Auth & buyer OTP — `fetch` via {@link apiRequest} + `NEXT_PUBLIC_API_BASE_URL`.
 */
import type {
  AdminAuthResponse,
  AdminLoginPayload,
  AuthVerifyResponse,
  BuyerAuthResponse,
  SendOtpPayload,
  VerifyBuyerOtpPayload,
  VerifySellerAgentOtpPayload,
} from "../../types";
import { apiRequest } from "./client";

export function sendSellerAgentOtp(payload: SendOtpPayload): Promise<void> {
  return apiRequest<void>("/auth/otp/send", {
    method: "POST",
    body: payload,
  });
}

export function verifySellerAgentOtp(
  payload: VerifySellerAgentOtpPayload
): Promise<AuthVerifyResponse> {
  return apiRequest<AuthVerifyResponse>("/auth/otp/verify", {
    method: "POST",
    body: payload,
  });
}

export function refreshAuthToken(token: string): Promise<AuthVerifyResponse> {
  return apiRequest<AuthVerifyResponse>("/auth/token/refresh", {
    method: "POST",
    token,
  });
}

export function sendBuyerOtp(payload: SendOtpPayload): Promise<void> {
  return apiRequest<void>("/buyers/otp/send", {
    method: "POST",
    body: payload,
  });
}

export function verifyBuyerOtp(
  payload: VerifyBuyerOtpPayload
): Promise<BuyerAuthResponse> {
  return apiRequest<BuyerAuthResponse>("/buyers/otp/verify", {
    method: "POST",
    body: payload,
  });
}

export function adminLogin(
  payload: AdminLoginPayload
): Promise<AdminAuthResponse> {
  return apiRequest<AdminAuthResponse>("/admin/auth/login", {
    method: "POST",
    body: payload,
  });
}
