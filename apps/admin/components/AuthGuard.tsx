"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  getRoles,
  hasAnyRole,
  isAuthed,
  rolesForPath,
} from "../lib/auth";

export function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    if (pathname === "/login") {
      setReady(true);
      setForbidden(false);
      return;
    }
    if (!isAuthed()) {
      router.replace("/login");
      return;
    }
    const allowed = rolesForPath(pathname);
    if (allowed && !hasAnyRole(getRoles(), allowed)) {
      setForbidden(true);
      setReady(true);
      return;
    }
    setForbidden(false);
    setReady(true);
  }, [pathname, router]);

  if (pathname === "/login") {
    return <>{children}</>;
  }

  if (!ready) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[var(--rw-bg)] text-[var(--rw-ink-muted)]">
        <p role="status">Checking session…</p>
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-3 bg-[var(--rw-bg)] px-6 text-center">
        <p className="text-lg font-semibold text-[var(--rw-ink)]">403 — Forbidden</p>
        <p className="max-w-md text-sm text-[var(--rw-ink-muted)]">
          Your role cannot open this page. API denials are also audit-logged.
        </p>
        <button
          type="button"
          className="text-sm font-medium text-[var(--rw-accent)] underline-offset-2 hover:underline"
          onClick={() => router.replace("/")}
        >
          Back to dashboard
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
