/**
 * Expo API helper. Tokens via AsyncStorage (Phase 1).
 * Prefer EXPO_PUBLIC_API_URL when injected by the bundler.
 * On 401, refreshes once then retries the request.
 */

import {
  clearTokens,
  getRefreshToken,
  setTokens,
} from "./auth";

const fromEnv = (
  globalThis as { process?: { env?: Record<string, string | undefined> } }
).process?.env?.EXPO_PUBLIC_API_URL;

export const API_URL = fromEnv ?? "http://localhost:3001/api/v1";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function messageFromBody(body: unknown, fallback: string): string {
  if (!body || typeof body !== "object") return fallback;
  const msg = (body as { message?: unknown }).message;
  if (typeof msg === "string") return msg;
  if (Array.isArray(msg) && msg.every((m) => typeof m === "string")) {
    return msg.join(", ");
  }
  return fallback;
}

let refreshInFlight: Promise<string | null> | null = null;

/** Exchange refresh token for a new access token (single-flight). */
export async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) return null;
    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) {
        // Invalid/expired refresh — drop session. Network blips keep tokens.
        if (res.status === 401 || res.status === 403) {
          await clearTokens();
        }
        return null;
      }
      const data = (await res.json()) as {
        accessToken?: string;
        refreshToken?: string;
      };
      if (!data.accessToken || !data.refreshToken) {
        await clearTokens();
        return null;
      }
      await setTokens(data.accessToken, data.refreshToken);
      return data.accessToken;
    } catch {
      return null;
    }
  })().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

export async function apiFetch<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    token?: string | null;
    /** Extra request headers (e.g. partner API key) */
    headers?: Record<string, string>;
    /** Internal: avoid refresh loops */
    _retried?: boolean;
  } = {},
): Promise<T> {
  const { method = "GET", body, token, headers } = options;
  const res = await fetch(`${API_URL}${path.startsWith("/") ? path : `/${path}`}`, {
    method,
    headers: {
      Accept: "application/json",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  if (!res.ok) {
    if (res.status === 401 && token && !options._retried) {
      const next = await refreshAccessToken();
      if (next) {
        return apiFetch<T>(path, { ...options, token: next, _retried: true });
      }
    }
    throw new ApiError(
      messageFromBody(
        parsed,
        res.status === 401
          ? "Session expired — sign in again from Profile"
          : res.statusText || "Request failed",
      ),
      res.status,
    );
  }

  return parsed as T;
}
