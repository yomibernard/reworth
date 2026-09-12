"use client";

import { canSeeFinance, getEmail, getRoles } from "../lib/auth";

const STUBS = [
  {
    id: "users",
    title: "Users",
    body: "Lookup and role assignment via /admin/users (Phase 1 API ready).",
  },
  {
    id: "listings",
    title: "Listings",
    body: "Moderation queues arrive in Phase 8.",
  },
  {
    id: "moderation",
    title: "Moderation",
    body: "Content & risk tooling — Phase 8–9.",
  },
  {
    id: "support",
    title: "Support",
    body: "Customer support workflows — Phase 8.",
  },
];

export default function AdminHomePage() {
  const roles = getRoles();
  const email = getEmail();
  const finance = canSeeFinance(roles);

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-2 text-[var(--rw-ink-muted)]">
          Signed in as {email ?? "admin"}
          {roles.length ? ` · ${roles.join(", ")}` : ""}
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {STUBS.map((card) => (
          <section
            key={card.id}
            id={card.id}
            className="rounded-[var(--rw-radius-lg)] border border-[var(--rw-border)] bg-[var(--rw-bg-elevated)] p-5"
          >
            <h2 className="text-lg font-semibold">{card.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--rw-ink-muted)]">
              {card.body}
            </p>
          </section>
        ))}

        {finance ? (
          <section
            id="finance"
            className="rounded-[var(--rw-radius-lg)] border border-[var(--rw-border)] bg-[var(--rw-bg-elevated)] p-5 sm:col-span-2"
          >
            <h2 className="text-lg font-semibold">Finance</h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--rw-ink-muted)]">
              Summary endpoint available at GET /admin/finance/summary. Full
              finance console ships in later phases.
            </p>
          </section>
        ) : null}
      </div>
    </div>
  );
}
