"use client";

import { Suspense } from "react";
import { Skeleton } from "@reworth/ui-web";
import SearchPageClient from "./SearchPageClient";

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-[100dvh] bg-[var(--rw-bg)] px-4 py-8">
          <Skeleton
            className="mx-auto h-12 w-full max-w-6xl"
            label="Loading search"
          />
        </main>
      }
    >
      <SearchPageClient />
    </Suspense>
  );
}
