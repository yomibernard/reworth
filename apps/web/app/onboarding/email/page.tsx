"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Input } from "@reworth/ui-web";
import { OnboardingShell } from "../../../components/OnboardingShell";
import { apiFetch, ApiError } from "../../../lib/api";
import { setTokens } from "../../../lib/auth";

type Mode = "register" | "login";

export default function OnboardingEmailPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const em = email.trim().toLowerCase();
    if (!em.includes("@") || password.length < 8) {
      setError("Email and password (min 8 characters) required");
      return;
    }
    setLoading(true);
    try {
      const path = mode === "register" ? "/auth/register" : "/auth/login";
      const body =
        mode === "register"
          ? {
              email: em,
              password,
              displayName: displayName.trim() || em.split("@")[0],
              device: { name: "ReWorth Web", platform: "WEB" },
            }
          : {
              email: em,
              password,
              device: { name: "ReWorth Web", platform: "WEB" },
            };
      const res = await apiFetch<{
        accessToken: string;
        refreshToken: string;
      }>(path, { method: "POST", body });
      setTokens({
        accessToken: res.accessToken,
        refreshToken: res.refreshToken,
      });
      router.push("/onboarding/profile");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Auth failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <OnboardingShell
      step={2}
      title={mode === "register" ? "Create account" : "Welcome back"}
      subtitle="Email works alongside phone OTP — pick what suits you."
    >
      <div className="mb-6 flex overflow-hidden rounded-[var(--rw-radius)] border border-[var(--rw-border)]">
        {(["register", "login"] as const).map((m) => (
          <button
            key={m}
            type="button"
            className={`min-h-11 flex-1 text-sm font-semibold ${
              mode === m
                ? "bg-[var(--rw-accent-muted)] text-[var(--rw-accent-hover)]"
                : "bg-[var(--rw-bg-elevated)] text-[var(--rw-ink-muted)]"
            }`}
            onClick={() => setMode(m)}
          >
            {m === "register" ? "Register" : "Log in"}
          </button>
        ))}
      </div>
      <form onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-4">
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          label="Password"
          type="password"
          autoComplete={mode === "register" ? "new-password" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {mode === "register" ? (
          <Input
            label="Display name (optional)"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        ) : null}
        {error ? (
          <p className="text-sm text-[var(--rw-error)]" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" variant="primary" size="lg" disabled={loading}>
          {loading
            ? "…"
            : mode === "register"
              ? "Create account"
              : "Log in"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm">
        <Link href="/onboarding/method" className="text-[var(--rw-accent)]">
          Back
        </Link>
      </p>
    </OnboardingShell>
  );
}
