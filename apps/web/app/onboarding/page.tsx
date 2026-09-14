"use client";

import Link from "next/link";
import { Button } from "@reworth/ui-web";
import { OnboardingShell } from "../../components/OnboardingShell";

const STEPS = [
  {
    title: "Sell fast",
    body: "Photograph an item, get an AI draft, and go live in about a minute.",
  },
  {
    title: "Local trust",
    body: "Trade with verified neighbours across Lekki, Ikoyi, VI, and nearby estates.",
  },
  {
    title: "AI listing",
    body: "Titles, prices, and categories suggested for Lagos — you stay in control.",
  },
];

export default function OnboardingWelcomePage() {
  return (
    <OnboardingShell
      step={1}
      title="Welcome to ReWorth"
      subtitle="Lagos, your unused things are worth something."
    >
      <ol className="flex flex-col gap-6">
        {STEPS.map((item, index) => (
          <li key={item.title} className="flex gap-4">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--rw-accent-muted)] text-sm font-semibold text-[var(--rw-accent)]"
              aria-hidden
            >
              {index + 1}
            </span>
            <div>
              <h2 className="text-lg font-semibold text-[var(--rw-ink)]">
                {item.title}
              </h2>
              <p className="mt-1 text-[var(--rw-ink-muted)] leading-relaxed">
                {item.body}
              </p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-auto flex flex-col gap-3 pt-12">
        <Link href="/onboarding/method" className="block">
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            aria-label="Get started"
          >
            Get started
          </Button>
        </Link>
        <Link
          href="/onboarding/method"
          className="text-center text-sm font-medium text-[var(--rw-accent)]"
        >
          Skip intro
        </Link>
      </div>
    </OnboardingShell>
  );
}
