"use client";

import type { ReactNode } from "react";
import { AuthGuard } from "./AuthGuard";
import { AdminShell } from "./AdminShell";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <AdminShell>{children}</AdminShell>
    </AuthGuard>
  );
}
