/**
 * Admin API client. Tokens stored in localStorage (Phase 1 interim).
 */

import { getAccessToken } from "./auth";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";

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

export async function apiFetch<T>(
  path: string,
  options: Omit<RequestInit, "body"> & {
    body?: unknown;
    token?: string | null;
  } = {},
): Promise<T> {
  const { body, token, headers, ...rest } = options;
  const res = await fetch(`${API_URL}${path.startsWith("/") ? path : `/${path}`}`, {
    ...rest,
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
    throw new ApiError(
      messageFromBody(parsed, res.statusText || "Request failed"),
      res.status,
    );
  }

  return parsed as T;
}

/** Authenticated admin fetch using stored access token. */
export async function adminFetch<T>(
  path: string,
  options: Omit<RequestInit, "body"> & { body?: unknown } = {},
): Promise<T> {
  const token = getAccessToken();
  if (!token) throw new ApiError("Not signed in", 401);
  return apiFetch<T>(path, { ...options, token });
}

export function csvUrl(path: string): string {
  const token = getAccessToken();
  const base = `${API_URL}${path.startsWith("/") ? path : `/${path}`}`;
  // Browser download cannot set Authorization — use query is not supported.
  // Pages should fetch blob with adminFetch pattern instead.
  void token;
  return base;
}

export async function downloadCsv(path: string, filename: string): Promise<void> {
  const token = getAccessToken();
  if (!token) throw new ApiError("Not signed in", 401);
  const res = await fetch(
    `${API_URL}${path.startsWith("/") ? path : `/${path}`}`,
    { headers: { Authorization: `Bearer ${token}`, Accept: "text/csv" } },
  );
  if (!res.ok) throw new ApiError("CSV download failed", res.status);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
