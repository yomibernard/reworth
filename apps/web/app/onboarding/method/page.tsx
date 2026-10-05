"use client";

import Link from "next/link";
import { Button } from "@reworth/ui-web";
import { OnboardingShell } from "../../../components/OnboardingShell";
import { brandPublic } from "../../../lib/brand";

export default function OnboardingMethodPage() {
  return (
    <OnboardingShell
      step={2}
      title="Join ReWorth"
      subtitle="Sign in with your phone number or email — then customise how neighbours see you."
      illustration={brandPublic.invite}
    >
      <div className="mt-auto flex flex-col gap-3 pt-8">
        <Link href="/onboarding/phone" className="block">
          <Button variant="primary" size="lg" className="w-full">
            Continue with phone
          </Button>
        </Link>
        <Link href="/onboarding/email" className="block">
          <Button variant="secondary" size="lg" className="w-full">
            Continue with email
          </Button>
        </Link>
      </div>
    </OnboardingShell>
  );
}
