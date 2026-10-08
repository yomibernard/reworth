"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Chip, Input } from "@reworth/ui-web";
import { OnboardingShell } from "../../../components/OnboardingShell";
import { apiFetch, ApiError } from "../../../lib/api";
import {
  clearOnboardingPhone,
  getAccessToken,
} from "../../../lib/auth";
import {
  COMMUNITIES,
  communitiesForCity,
  type Community,
} from "../../../lib/communities";
import { listRegions, type RegionCity } from "../../../lib/region";
import type { MeResponse } from "../../../lib/types";

export default function OnboardingProfilePage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [community, setCommunity] = useState<Community | "">("");
  const [cityKey, setCityKey] = useState("lagos");
  const [cities, setCities] = useState<RegionCity[]>([]);
  const [bio, setBio] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace("/onboarding/phone");
      return;
    }
    void listRegions()
      .then((list) => {
        setCities(list);
        if (list[0]?.key) setCityKey(list[0].key);
      })
      .catch(() => {
        /* keep Lagos default */
      });
    apiFetch<MeResponse>("/me", { token })
      .then((me) => {
        if (me.profile?.displayName) setDisplayName(me.profile.displayName);
        if (me.profile?.bio) setBio(me.profile.bio);
        const pref = me.profile?.preferredCommunity;
        if (pref && (COMMUNITIES as readonly string[]).includes(pref)) {
          setCommunity(pref as Community);
        }
      })
      .catch(() => {
        /* keep empty form */
      })
      .finally(() => setBooting(false));
  }, [router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const name = displayName.trim();
    if (name.length < 1) {
      setError("Choose a display name");
      return;
    }
    if (!community) {
      setError("Pick your preferred community");
      return;
    }

    const token = getAccessToken();
    if (!token) {
      router.replace("/onboarding/phone");
      return;
    }

    setLoading(true);
    try {
      await apiFetch<MeResponse>("/me", {
        method: "PATCH",
        token,
        body: {
          displayName: name,
          preferredCommunity: community,
          bio: bio.trim() || null,
        },
      });
      clearOnboardingPhone();
      router.push("/");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not save profile.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (booting) {
    return (
      <OnboardingShell step={4} title="Your profile" subtitle="Loading…">
        <p className="text-[var(--rw-ink-muted)]" role="status">
          Loading…
        </p>
      </OnboardingShell>
    );
  }

  return (
    <OnboardingShell
      step={4}
      title="Customise your profile"
      subtitle="Name, bio, and community — how neighbours in your city see you."
    >
      <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-8" noValidate>
        <Input
          label="Display name"
          name="displayName"
          autoComplete="nickname"
          maxLength={80}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          disabled={loading}
          required
        />

        <Input
          label="Bio (optional)"
          name="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          disabled={loading}
          hint="A short line about you"
        />

        {cities.length > 0 ? (
          <fieldset>
            <legend className="mb-3 text-sm font-medium text-[var(--rw-ink)]">
              City
            </legend>
            <div
              className="flex flex-wrap gap-2"
              role="listbox"
              aria-label="City"
            >
              {cities.map((c) => {
                const key = c.key || c.city || "";
                return (
                  <Chip
                    key={key}
                    selected={cityKey === key}
                    onClick={() => {
                      setCityKey(key);
                      setCommunity("");
                    }}
                    disabled={loading}
                    aria-label={c.displayName || key}
                  >
                    {c.displayName || key}
                  </Chip>
                );
              })}
            </div>
          </fieldset>
        ) : null}

        <fieldset>
          <legend className="mb-3 text-sm font-medium text-[var(--rw-ink)]">
            Preferred community
          </legend>
          <div
            className="flex flex-wrap gap-2"
            role="listbox"
            aria-label="Preferred community"
          >
            {communitiesForCity(cityKey).map((c) => (
              <Chip
                key={c}
                selected={community === c}
                onClick={() => setCommunity(c as Community)}
                disabled={loading}
                aria-label={c}
              >
                {c}
              </Chip>
            ))}
          </div>
        </fieldset>

        {error ? (
          <p className="text-sm text-[var(--rw-error)]" role="alert">
            {error}
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
            {loading ? "Saving…" : "Enter ReWorth"}
          </Button>
        </div>
      </form>
    </OnboardingShell>
  );
}
