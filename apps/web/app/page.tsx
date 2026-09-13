"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Chip, EmptyState, Skeleton } from "@reworth/ui-web";
import { DiscoveryListingCard } from "../components/discovery/DiscoveryListingCard";
import { ApiError } from "../lib/api";
import { getAccessToken } from "../lib/auth";
import { COMMUNITIES } from "../lib/communities";
import {
  RADIUS_OPTIONS,
  fetchCategories,
  fetchHome,
  looksLikeNaturalLanguage,
  loadDiscoveryLocation,
  saveDiscoveryLocation,
  type DiscoveryLocation,
} from "../lib/discovery";
import { formatNgn } from "@reworth/shared";
import type { CategoryNode, HomeRail, RadiusKm } from "../lib/types";

export default function HomePage() {
  const router = useRouter();
  const [loc, setLoc] = useState<DiscoveryLocation>({
    community: "",
    radiusKm: "all",
  });
  const [query, setQuery] = useState("");
  const [useNl, setUseNl] = useState(false);
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [rails, setRails] = useState<HomeRail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoc(loadDiscoveryLocation());
  }, []);

  const load = useCallback(async (location: DiscoveryLocation) => {
    setLoading(true);
    setError(null);
    try {
      const radiusKm =
        location.radiusKm === "all"
          ? undefined
          : (location.radiusKm as RadiusKm);
      const [home, cats] = await Promise.all([
        fetchHome(
          {
            community: location.community || undefined,
            radiusKm,
          },
          getAccessToken(),
        ),
        fetchCategories().catch(() => [] as CategoryNode[]),
      ]);
      setRails(home.rails ?? []);
      setCategories(cats);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load home");
      setRails([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(loc);
  }, [loc, load]);

  function updateLoc(next: DiscoveryLocation) {
    setLoc(next);
    saveDiscoveryLocation(next);
  }

  function submitSearch(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (loc.community) params.set("community", loc.community);
    if (loc.radiusKm !== "all") params.set("radiusKm", String(loc.radiusKm));
    const nl = useNl || looksLikeNaturalLanguage(q);
    if (nl && q) params.set("nl", "1");
    router.push(`/search?${params.toString()}`);
  }

  return (
    <main className="relative min-h-[100dvh] bg-[var(--rw-bg)] text-[var(--rw-ink)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[42vh]"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 70% 0%, rgba(14,159,110,0.16), transparent 55%), radial-gradient(ellipse 40% 30% at 10% 20%, rgba(201,162,39,0.1), transparent 50%), linear-gradient(180deg, #F3F0EA 0%, var(--rw-bg) 100%)",
        }}
      />

      <header className="sticky top-0 z-30 border-b border-[var(--rw-border)]/70 bg-[var(--rw-bg)]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
          <Link
            href="/"
            className="shrink-0 text-lg font-semibold tracking-tight sm:text-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rw-accent)]"
          >
            ReWorth
          </Link>

          <form
            onSubmit={submitSearch}
            className="flex min-w-0 flex-1 items-center gap-2"
            role="search"
          >
            <label htmlFor="home-search" className="sr-only">
              Search listings
            </label>
            <input
              id="home-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Lagos…"
              className="min-w-0 flex-1 rounded-[var(--rw-radius)] border border-[var(--rw-border)] bg-[var(--rw-bg-elevated)] px-3 py-2 text-sm sm:text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rw-accent)]"
            />
            <label className="hidden items-center gap-1 text-xs text-[var(--rw-ink-muted)] sm:flex">
              <input
                type="checkbox"
                checked={useNl}
                onChange={(e) => setUseNl(e.target.checked)}
                className="accent-[var(--rw-accent)]"
              />
              NL
            </label>
            <Button type="submit" variant="primary" size="sm">
              Search
            </Button>
          </form>

          <Link href="/my" className="hidden text-sm font-medium text-[var(--rw-ink-muted)] hover:text-[var(--rw-ink)] sm:inline">
            Saved
          </Link>
          <Link href="/sell">
            <Button variant="sell" size="sm" aria-label="Start selling">
              SELL
            </Button>
          </Link>
        </div>
      </header>

      <div className="relative z-10 mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6">
        <section className="rw-fade-up">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Find something worth keeping.
          </h1>
          <p className="mt-2 max-w-xl text-[var(--rw-ink-muted)]">
            Lagos, your unused things are worth something.
          </p>
        </section>

        <section
          aria-label="Location"
          className="mt-6 flex flex-wrap items-center gap-2"
        >
          <label className="sr-only" htmlFor="home-community">
            Community
          </label>
          <select
            id="home-community"
            value={loc.community}
            onChange={(e) =>
              updateLoc({ ...loc, community: e.target.value })
            }
            className="rounded-full border border-[var(--rw-border)] bg-[var(--rw-bg-elevated)] px-3 py-1.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rw-accent)]"
          >
            <option value="">All communities</option>
            {COMMUNITIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Radius">
            {RADIUS_OPTIONS.map((opt) => (
              <Chip
                key={String(opt.value)}
                selected={loc.radiusKm === opt.value}
                onClick={() => updateLoc({ ...loc, radiusKm: opt.value })}
              >
                {opt.label}
              </Chip>
            ))}
          </div>
        </section>

        <section aria-label="Categories" className="mt-6">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {categories.length === 0 && loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton
                    key={i}
                    className="h-9 w-24 shrink-0 rounded-full"
                    label="Loading category"
                  />
                ))
              : categories.map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/search?categoryId=${encodeURIComponent(cat.id)}`}
                    className="shrink-0"
                  >
                    <Chip>{cat.name}</Chip>
                  </Link>
                ))}
          </div>
        </section>

        {error ? (
          <div className="mt-12">
            <EmptyState
              title="Couldn’t load discovery"
              description={error}
              action={
                <Button variant="primary" onClick={() => void load(loc)}>
                  Retry
                </Button>
              }
            />
          </div>
        ) : loading ? (
          <div className="mt-10 space-y-10">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i}>
                <Skeleton className="mb-4 h-6 w-40" label="Loading rail" />
                <div className="flex gap-3 overflow-hidden">
                  {Array.from({ length: 4 }).map((__, j) => (
                    <Skeleton
                      key={j}
                      className="h-56 w-44 shrink-0 rounded-[var(--rw-radius-lg)]"
                      label="Loading card"
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-10 space-y-12">
            {rails.map((rail) => {
              const isMovingSales = rail.id === "moving_sales";
              const movingSales = rail.movingSales ?? [];
              const hasMoving = isMovingSales && movingSales.length > 0;
              const hasListings = rail.items.length > 0;
              const empty = isMovingSales
                ? !hasMoving && !hasListings
                : !hasListings;

              return (
                <section key={rail.id} aria-labelledby={`rail-${rail.id}`}>
                  <h2
                    id={`rail-${rail.id}`}
                    className="text-xl font-semibold tracking-tight"
                  >
                    {rail.title}
                  </h2>
                  {empty ? (
                    <p className="mt-3 text-sm text-[var(--rw-ink-muted)]">
                      {rail.emptyMessage ?? "Nothing here yet."}
                    </p>
                  ) : (
                    <>
                      {hasMoving ? (
                        <ul className="mt-4 flex gap-3 overflow-x-auto pb-2">
                          {movingSales.map((ms) => (
                            <li key={ms.id} className="w-52 shrink-0 sm:w-60">
                              <Link
                                href={`/moving-sales/${ms.id}`}
                                className="block rounded-[var(--rw-radius-lg)] border border-[var(--rw-border)] bg-[var(--rw-bg-elevated)] p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rw-accent)]"
                              >
                                <p className="line-clamp-2 font-semibold leading-snug">
                                  {ms.title}
                                </p>
                                <p className="mt-2 text-sm text-[var(--rw-ink-muted)]">
                                  {ms.itemCount} item
                                  {ms.itemCount === 1 ? "" : "s"} ·{" "}
                                  {formatNgn({
                                    amountKobo: ms.combinedPriceKobo,
                                  })}{" "}
                                  combined
                                </p>
                                {ms.community ? (
                                  <p className="mt-1 text-xs text-[var(--rw-ink-muted)]">
                                    {ms.community}
                                  </p>
                                ) : null}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      {hasListings ? (
                        <ul className="mt-4 flex gap-3 overflow-x-auto pb-2">
                          {rail.items.map((item) => (
                            <li key={item.id} className="w-44 shrink-0 sm:w-52">
                              <DiscoveryListingCard listing={item} />
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </>
                  )}
                </section>
              );
            })}
            {rails.length === 0 ? (
              <EmptyState
                title="No listings nearby"
                description="Try another community or be the first to sell."
                action={
                  <Link href="/sell">
                    <Button variant="sell">SELL</Button>
                  </Link>
                }
              />
            ) : null}
          </div>
        )}
      </div>
    </main>
  );
}
