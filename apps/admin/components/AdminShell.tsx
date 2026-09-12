"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@reworth/ui-web";
import {
  canSeeFinance,
  clearSession,
  getEmail,
  getRoles,
} from "../lib/auth";

const NAV = [
  { href: "/", label: "Dashboard", roles: null },
  { href: "/#users", label: "Users", roles: null },
  { href: "/#listings", label: "Listings", stub: true },
  { href: "/#moderation", label: "Moderation", stub: true },
  { href: "/#finance", label: "Finance", roles: ["FINANCE", "SUPER_ADMIN"] as const },
  { href: "/#support", label: "Support", stub: true },
] as const;

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const roles = getRoles();
  const email = getEmail();
  const showFinance = canSeeFinance(roles);

  function signOut() {
    clearSession();
    router.replace("/login");
  }

  if (pathname === "/login") {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-[100dvh] bg-[var(--rw-bg)] text-[var(--rw-ink)]">
      <aside
        className="hidden w-56 shrink-0 flex-col border-r border-[var(--rw-border)] bg-[var(--rw-bg-elevated)] px-4 py-6 md:flex"
        aria-label="Admin navigation"
      >
        <p className="px-2 text-lg font-semibold tracking-tight">ReWorth</p>
        <p className="mb-8 px-2 text-xs text-[var(--rw-ink-muted)]">Ops</p>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map((item) => {
            if (item.label === "Finance" && !showFinance) return null;
            return (
              <Link
                key={item.label}
                href={item.href}
                className="rounded-[var(--rw-radius)] px-3 py-2 text-sm font-medium text-[var(--rw-ink-muted)] hover:bg-[var(--rw-accent-muted)] hover:text-[var(--rw-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rw-accent)]"
              >
                {item.label}
                {"stub" in item && item.stub ? (
                  <span className="ml-1 text-xs opacity-60">soon</span>
                ) : null}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto space-y-2 border-t border-[var(--rw-border)] pt-4">
          {email ? (
            <p className="truncate px-2 text-xs text-[var(--rw-ink-muted)]">
              {email}
            </p>
          ) : null}
          <Button variant="ghost" size="sm" className="w-full" onClick={signOut}>
            Sign out
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-[var(--rw-border)] bg-[var(--rw-bg-elevated)] px-4 py-3 md:hidden">
          <p className="font-semibold">ReWorth Ops</p>
          <Button variant="ghost" size="sm" onClick={signOut}>
            Sign out
          </Button>
        </header>
        <div className="flex-1 p-6 sm:p-8">{children}</div>
      </div>
    </div>
  );
}
