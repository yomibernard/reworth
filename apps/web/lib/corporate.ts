/**
 * Phase 3.2 — Corporate relocation workspace (Persona C).
 */

import { apiFetch, API_URL } from "./api";

export type CorporateAccountStatus =
  | "APPLIED"
  | "APPROVED"
  | "ACTIVE"
  | "SUSPENDED"
  | "REJECTED"
  | string;

export type RelocationProjectStatus =
  | "DRAFT"
  | "INTAKE"
  | "LISTED"
  | "IN_FULFILMENT"
  | "COMPLETING"
  | "COMPLETED"
  | "CANCELLED"
  | string;

export type CorporateAccount = {
  id: string;
  companyName: string;
  billingContact: string;
  billingEmail: string;
  dpaRecordRef?: string | null;
  supportTier?: string;
  status: CorporateAccountStatus;
  reviewedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  role?: string;
};

export type CorporateApplyBody = {
  companyName: string;
  billingContact: string;
  billingEmail: string;
  dpaRecordRef?: string;
  supportTier?: string;
};

export type RelocationItem = {
  id: string;
  projectId?: string;
  title: string;
  notes?: string;
  listingId?: string | null;
  createdAt?: string;
};

export type RelocationCompletionReport = {
  itemsTotal?: number;
  itemsSold?: number;
  itemsDonated?: number;
  itemsReturned?: number;
  gmvKobo?: number;
  notes?: string;
  [key: string]: unknown;
};

export type RelocationProject = {
  id: string;
  corporateAccountId: string;
  ownerUserId?: string;
  title: string;
  employeeName: string;
  deadline: string;
  cityFrom: string;
  cityTo: string;
  communityFrom?: string;
  communityTo?: string;
  status: RelocationProjectStatus;
  movingSaleId?: string | null;
  completionReport?: RelocationCompletionReport | null;
  invoiceNumber?: string | null;
  invoicePdfKey?: string | null;
  settledAt?: string | null;
  items?: RelocationItem[];
  timeline?: { status: string; at?: string; label?: string }[];
  createdAt?: string;
  updatedAt?: string;
};

export type CreateRelocationProjectBody = {
  title: string;
  employeeName: string;
  deadline: string;
  cityFrom: string;
  cityTo: string;
  communityFrom?: string;
  communityTo?: string;
};

export type IntakeBody = {
  items: { title: string; notes?: string }[];
};

function asList<T>(res: T[] | { items?: T[]; projects?: T[] } | null | undefined): T[] {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.items)) return res.items;
  if (Array.isArray(res.projects)) return res.projects;
  return [];
}

export async function applyCorporate(
  token: string,
  body: CorporateApplyBody,
): Promise<CorporateAccount> {
  return apiFetch<CorporateAccount>("/corporate/apply", {
    method: "POST",
    token,
    body,
  });
}

export async function getMyCorporate(
  token: string,
): Promise<CorporateAccount | null> {
  try {
    return await apiFetch<CorporateAccount>("/me/corporate", { token });
  } catch (err) {
    const status = (err as { status?: number })?.status;
    if (status === 404) return null;
    throw err;
  }
}

export async function listRelocationProjects(
  token: string,
): Promise<RelocationProject[]> {
  const res = await apiFetch<
    RelocationProject[] | { items?: RelocationProject[]; projects?: RelocationProject[] }
  >("/corporate/projects", { token });
  return asList(res);
}

export async function createRelocationProject(
  token: string,
  body: CreateRelocationProjectBody,
): Promise<RelocationProject> {
  return apiFetch<RelocationProject>("/corporate/projects", {
    method: "POST",
    token,
    body,
  });
}

export async function getRelocationProject(
  token: string,
  projectId: string,
): Promise<RelocationProject> {
  return apiFetch<RelocationProject>(
    `/corporate/projects/${encodeURIComponent(projectId)}`,
    { token },
  );
}

export async function intakeRelocationItems(
  token: string,
  projectId: string,
  body: IntakeBody,
): Promise<RelocationProject> {
  return apiFetch<RelocationProject>(
    `/corporate/projects/${encodeURIComponent(projectId)}/intake`,
    { method: "POST", token, body },
  );
}

export async function completeRelocationProject(
  token: string,
  projectId: string,
): Promise<RelocationProject> {
  return apiFetch<RelocationProject>(
    `/corporate/projects/${encodeURIComponent(projectId)}/complete`,
    { method: "POST", token, body: {} },
  );
}

/** Invoice download URL (Bearer required — use fetch blob in UI). */
export function relocationInvoicePath(projectId: string): string {
  return `/corporate/projects/${encodeURIComponent(projectId)}/invoice`;
}

export async function downloadRelocationInvoice(
  token: string,
  projectId: string,
  filename?: string,
): Promise<void> {
  const res = await fetch(
    `${API_URL}${relocationInvoicePath(projectId)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/pdf,application/octet-stream,text/plain,*/*",
      },
    },
  );
  if (!res.ok) {
    const { ApiError } = await import("./api");
    throw new ApiError("Invoice download failed", res.status);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename ?? `reworth-invoice-${projectId.slice(0, 8)}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

export const PROJECT_STATUS_ORDER: RelocationProjectStatus[] = [
  "DRAFT",
  "INTAKE",
  "LISTED",
  "IN_FULFILMENT",
  "COMPLETING",
  "COMPLETED",
];

export function projectStatusLabel(status: string): string {
  const map: Record<string, string> = {
    DRAFT: "Draft",
    INTAKE: "Intake",
    LISTED: "Listed",
    IN_FULFILMENT: "In fulfilment",
    COMPLETING: "Completing",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
  };
  return map[status] ?? status;
}
