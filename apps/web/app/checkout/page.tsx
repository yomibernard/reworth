"use client";

import { Suspense } from "react";
import { Skeleton } from "@reworth/ui-web";
import CheckoutPage from "./CheckoutClient";

export default function CheckoutRoute() {
  return (
    <Suspense
      fallback={
        <main className="min-h-[100dvh] bg-[var(--rw-bg)] px-4 py-8">
          <div className="mx-auto max-w-lg space-y-4">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-40 w-full" />
          </div>
        </main>
      }
    >
      <CheckoutPage />
    </Suspense>
  );
}
