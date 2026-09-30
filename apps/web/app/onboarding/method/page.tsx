"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@reworth/ui-web";
import { OnboardingShell } from "../../../components/OnboardingShell";
import { ApiError } from "../../../lib/api";
import { brandPublic } from "../../../lib/brand";
import { completeOAuth, type OAuthProvider } from "../../../lib/oauth";

export default function OnboardingMethodPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<OAuthProvider | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onOAuth(provider: OAuthProvider) {
    setError(null);
    setLoading(provider);
    try {
      await completeOAuth(provider);
      router.push("/onboarding/profile");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : provider === "google"
            ? "Google sign-in failed"
            : "Apple sign-in failed",
      );
    } finally {
      setLoading(null);
    }
  }

  return (
    <OnboardingShell
      step={2}
      title="Join ReWorth"
      subtitle="Phone, email, or Google / Apple — then customise how neighbours see you."
      illustration={brandPublic.invite}
    >
      <div className="mt-auto flex flex-col gap-3 pt-8">
        <Link href="/onboarding/phone" className="block">
          <Button
            variant="primary"
            size="lg"
            className="flex w-full items-center justify-center gap-3"
            disabled={Boolean(loading)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={brandPublic.actionChat} alt="" className="h-6 w-6" />
            Continue with phone
          </Button>
        </Link>
        <Link href="/onboarding/email" className="block">
          <Button
            variant="secondary"
            size="lg"
            className="flex w-full items-center justify-center gap-3"
            disabled={Boolean(loading)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={brandPublic.actionShare} alt="" className="h-6 w-6" />
            Continue with email
          </Button>
        </Link>

        <div className="my-2 flex items-center gap-3" aria-hidden>
          <div className="h-px flex-1 bg-[var(--rw-border)]" />
          <span className="text-xs font-medium uppercase tracking-wide text-[var(--rw-ink-muted)]">
            or
          </span>
          <div className="h-px flex-1 bg-[var(--rw-border)]" />
        </div>

        <Button
          type="button"
          variant="ghost"
          size="lg"
          className="w-full"
          disabled={Boolean(loading)}
          onClick={() => void onOAuth("google")}
        >
          {loading === "google" ? "…" : "Continue with Google"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="lg"
          className="w-full"
          disabled={Boolean(loading)}
          onClick={() => void onOAuth("apple")}
        >
          {loading === "apple" ? "…" : "Continue with Apple"}
        </Button>

        {error ? (
          <p className="text-sm text-[var(--rw-error)]" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </OnboardingShell>
  );
}
