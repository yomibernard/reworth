"use client";

import { Suspense } from "react";
import { Skeleton } from "@reworth/ui-web";
import NewMovingSaleClient from "./NewMovingSaleClient";

export default function NewMovingSalePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-[100dvh] bg-[var(--rw-bg)] px-4 py-8">
          <div className="mx-auto max-w-2xl space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-40 w-full" />
          </div>
        </main>
      }
    >
      <NewMovingSaleClient />
    </Suspense>
  );
}
