import type { ReactNode } from "react";
import Link from "next/link";

type OnboardingShellProps = {
  children: ReactNode;
  step?: number;
  totalSteps?: number;
  title: string;
  subtitle?: string;
};

export function OnboardingShell({
  children,
  step,
  totalSteps = 4,
  title,
  subtitle,
}: OnboardingShellProps) {
  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-[var(--rw-bg)] text-[var(--rw-ink)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 80% 0%, rgba(14,159,110,0.14), transparent 55%), radial-gradient(ellipse 40% 35% at 10% 90%, rgba(201,162,39,0.1), transparent 50%), linear-gradient(165deg, #FCFAF6 0%, #F3F0EA 50%, #E8F5EF 100%)",
        }}
      />

      <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-lg flex-col px-6 py-10 sm:px-8">
        <header className="mb-10 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="font-[family-name:var(--font-geist-sans)] text-xl font-semibold tracking-tight text-[var(--rw-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rw-accent)]"
          >
            ReWorth
          </Link>
          {step !== undefined ? (
            <p
              className="text-sm text-[var(--rw-ink-muted)]"
              aria-label={`Step ${step} of ${totalSteps}`}
            >
              {step} / {totalSteps}
            </p>
          ) : null}
        </header>

        {step !== undefined ? (
          <div
            className="mb-8 flex gap-1.5"
            role="progressbar"
            aria-valuenow={step}
            aria-valuemin={1}
            aria-valuemax={totalSteps}
            aria-label="Onboarding progress"
          >
            {Array.from({ length: totalSteps }, (_, i) => (
              <span
                key={i}
                className={[
                  "h-1 flex-1 rounded-full transition-colors",
                  i < step ? "bg-[var(--rw-accent)]" : "bg-[var(--rw-border)]",
                ].join(" ")}
              />
            ))}
          </div>
        ) : null}

        <div className="rw-fade-up flex flex-1 flex-col">
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--rw-ink)] sm:text-4xl">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-3 text-base leading-relaxed text-[var(--rw-ink-muted)]">
              {subtitle}
            </p>
          ) : null}
          <div className="mt-8 flex flex-1 flex-col">{children}</div>
        </div>
      </div>
    </main>
  );
}
