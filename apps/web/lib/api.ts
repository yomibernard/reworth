/**
 * ReWorth web API client.
 *
 * Token storage (Phase 1 interim): access + refresh tokens live in localStorage
 * (client cookies). Prefer httpOnly cookies + BFF in a later hardening phase.
 */

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
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

export type ApiFetchOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  token?: string | null;
};

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {},
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
      parsed,
    );
  }

  return parsed as T;
}
