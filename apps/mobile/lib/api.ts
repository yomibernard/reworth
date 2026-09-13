/**
 * Expo API helper. Tokens via AsyncStorage (Phase 1).
 * Prefer EXPO_PUBLIC_API_URL when injected by the bundler.
 */

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

export async function apiFetch<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    token?: string | null;
  } = {},
): Promise<T> {
  const { method = "GET", body, token } = options;
  const res = await fetch(`${API_URL}${path.startsWith("/") ? path : `/${path}`}`, {
    method,
    headers: {
      Accept: "application/json",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
