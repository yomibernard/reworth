/**
 * Ask ReWorth — marketplace assistant (Phase 3.1).
 */

import { apiFetch } from "./api";

export type AssistantSession = {
  id: string;
  title?: string | null;
  city?: string;
};

export type AssistantPostMessageResponse = {
  message: { id: string; role: string; content: string };
  toolName?: string;
  degraded?: boolean;
  confirmed?: boolean;
  proposal?: {
    kind: string;
    toolName: string;
    summary: string;
    confirmToken: string;
  } | null;
  payload?: Record<string, unknown>;
};

export async function createAssistantSession(
  token: string,
  body?: { city?: string; title?: string },
): Promise<AssistantSession> {
  return apiFetch("/assistant/sessions", {
    method: "POST",
    token,
    body: body ?? {},
  });
}

export async function sendAssistantMessage(
  token: string,
  sessionId: string,
  content: string,
  confirmToken?: string,
): Promise<AssistantPostMessageResponse> {
  return apiFetch(`/assistant/sessions/${sessionId}/messages`, {
    method: "POST",
    token,
    body: {
      content,
      ...(confirmToken ? { confirmToken } : {}),
    },
  });
}
