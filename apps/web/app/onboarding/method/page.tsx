"use client";

import Link from "next/link";
import { Button } from "@reworth/ui-web";
import { OnboardingShell } from "../../../components/OnboardingShell";

export default function OnboardingMethodPage() {
  return (
    <OnboardingShell
      step={2}
      title="Join ReWorth"
      subtitle="Use your phone or email — then customise how neighbours see you."
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
