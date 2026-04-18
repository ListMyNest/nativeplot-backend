import type { ApiErrorBody } from "../../types";

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, body: unknown, message?: string) {
    super(message ?? `Request failed with status ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

/**
 * REST base URL (no trailing slash). Matches {@link ../api.BASE_URL} fallback.
 */
export function getApiBaseUrl(): string {
  const base =
    process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "") ||
    "http://localhost:8080/v1";
  return base;
}

function appendQuery(
  path: string,
  query?: Record<string, string | number | boolean | undefined | null>
): string {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

export type ApiRequestOptions = {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  /** Authorization: Bearer … */
  token?: string;
  headers?: HeadersInit;
  signal?: AbortSignal;
};

/**
 * Typed `fetch` to `${NEXT_PUBLIC_API_BASE_URL}${path}` (see {@link getApiBaseUrl}).
 * Throws {@link ApiError} on non-OK responses (attempts to parse JSON body).
 */
export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { method = "GET", query, body, token, headers, signal } = options;
  const base = getApiBaseUrl();
  const url = `${base}${appendQuery(path, query)}`;
  const init: RequestInit = {
    method,
    signal,
    headers: {
      Accept: "application/json",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }

  const res = await fetch(url, init);
  const text = await res.text();
  let parsed: unknown = text;
  if (text) {
    try {
      parsed = JSON.parse(text) as unknown;
    } catch {
      parsed = text;
    }
  } else {
    parsed = undefined;
  }

  if (!res.ok) {
    const msg =
      typeof parsed === "object" &&
      parsed !== null &&
      "message" in parsed &&
      typeof (parsed as ApiErrorBody).message === "string"
        ? (parsed as ApiErrorBody).message
        : typeof parsed === "object" &&
            parsed !== null &&
            "error" in parsed &&
            typeof (parsed as ApiErrorBody).error === "string"
          ? (parsed as ApiErrorBody).error
          : undefined;
    throw new ApiError(res.status, parsed, msg);
  }

  return parsed as T;
}
