"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input } from "@reworth/ui-web";
import { OnboardingShell } from "../../../components/OnboardingShell";
import { apiFetch, ApiError } from "../../../lib/api";
import {
  getOnboardingPhone,
  setTokens,
} from "../../../lib/auth";
import type { AuthTokenResponse } from "../../../lib/types";

export default function OnboardingOtpPage() {
  const router = useRouter();
  const [phone, setPhone] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = getOnboardingPhone();
    if (!stored) {
      router.replace("/onboarding/phone");
      return;
    }
    setPhone(stored);
  }, [router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!phone) return;
    setError(null);

    const trimmed = code.replace(/\D/g, "");
    if (trimmed.length !== 6) {
      setError("Enter the 6-digit code from your SMS");
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch<AuthTokenResponse>("/auth/otp/verify", {
        method: "POST",
        body: {
          phone,
          code: trimmed,
          device: { name: "ReWorth Web", platform: "WEB" },
        },
      });
      // Interim Phase 1: tokens in localStorage (not httpOnly)
      setTokens({
        accessToken: res.accessToken,
        refreshToken: res.refreshToken,
      });
      router.push("/onboarding/profile");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Verification failed. Try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (!phone) {
    return (
      <OnboardingShell step={3} title="Checking…" subtitle="One moment.">
        <p className="text-[var(--rw-ink-muted)]" role="status">
          Loading…
        </p>
      </OnboardingShell>
    );
  }

  return (
    <OnboardingShell
      step={3}
      title="Enter code"
      subtitle={`We sent a 6-digit code to ${phone}.`}
    >
      <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-6" noValidate>
        <Input
          label="One-time code"
          name="otp"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={6}
          placeholder="••••••"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          error={error ?? undefined}
          disabled={loading}
          required
          className="tracking-[0.35em] text-center text-xl font-semibold"
        />

        <div className="mt-auto flex flex-col gap-3 pt-4">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? "Verifying…" : "Verify"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            disabled={loading}
            onClick={() => router.push("/onboarding/phone")}
          >
            Change number
          </Button>
        </div>
      </form>
    </OnboardingShell>
  );
}
