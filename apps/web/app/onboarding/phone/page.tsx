"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input } from "@reworth/ui-web";
import { OnboardingShell } from "../../../components/OnboardingShell";
import { apiFetch, ApiError } from "../../../lib/api";
import {
  isValidNgPhone,
  normalizeNgPhone,
  setOnboardingPhone,
} from "../../../lib/auth";
import type { OtpRequestResponse } from "../../../lib/types";
import { brandPublic } from "../../../lib/brand";

export default function OnboardingPhonePage() {
  const router = useRouter();
  const [phone, setPhone] = useState("+234");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [debugHint, setDebugHint] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setDebugHint(null);

    const normalized = normalizeNgPhone(phone);
    if (!isValidNgPhone(normalized)) {
      setError("Enter a valid Nigerian number, e.g. +2348012345678");
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch<OtpRequestResponse>("/auth/otp/request", {
        method: "POST",
        body: { phone: normalized },
      });
      setOnboardingPhone(normalized);
      if (res.debugCode) {
        setDebugHint(`Dev code: ${res.debugCode}`);
      }
      router.push("/onboarding/otp");
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Could not send code. Try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <OnboardingShell
      step={2}
      title="Your phone"
      subtitle="We’ll send a 6-digit code by SMS and WhatsApp at the same time."
      illustration={brandPublic.onboarding}
    >
      <div
        className="mb-2 flex flex-wrap gap-2"
        aria-label="Delivery channels"
      >
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--rw-border)] bg-[var(--rw-bg-elevated)] px-3 py-1.5 text-xs font-semibold text-[var(--rw-ink-muted)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={brandPublic.actionChat} alt="" className="h-4 w-4" />
          SMS
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--rw-border)] bg-[var(--rw-bg-elevated)] px-3 py-1.5 text-xs font-semibold text-[var(--rw-ink-muted)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={brandPublic.invite} alt="" className="h-4 w-4" />
          WhatsApp
        </span>
      </div>
      <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-6" noValidate>
        <Input
          label="Phone number"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="+2348012345678"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          error={error ?? undefined}
          hint="Nigeria format: +234 followed by 10 digits"
          disabled={loading}
          required
        />

        {debugHint ? (
          <p className="text-sm text-[var(--rw-accent)]" role="status">
            {debugHint}
          </p>
        ) : null}

        <div className="mt-auto pt-4">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? "Sending code…" : "Send code"}
          </Button>
        </div>
      </form>
    </OnboardingShell>
  );
}
