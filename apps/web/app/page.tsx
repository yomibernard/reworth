"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Chip, EmptyState, Skeleton } from "@reworth/ui-web";
import { DiscoveryListingCard } from "../components/discovery/DiscoveryListingCard";
import { ApiError } from "../lib/api";
import { getAccessToken } from "../lib/auth";
import {
  cityDisplayName,
  communitiesForCity,
  normalizeCityKey,
} from "../lib/communities";
import {
  fetchCategories,
  fetchHome,
  looksLikeNaturalLanguage,
  loadDiscoveryLocation,
  radiusOptionsForCity,
  saveDiscoveryLocation,
  type DiscoveryLocation,
} from "../lib/discovery";
import { listRegions, type RegionCity } from "../lib/region";
import { formatNgn } from "@reworth/shared";
import type { CategoryNode, HomeRail, RadiusKm } from "../lib/types";
import { brandPublic, categoryBrandIcon } from "../lib/brand";

export default function HomePage() {
  const router = useRouter();
  const [loc, setLoc] = useState<DiscoveryLocation>({
    city: "lagos",
    community: "",
    radiusKm: "all",
  });
  const [cities, setCities] = useState<RegionCity[]>([]);
  const [query, setQuery] = useState("");
  const [useNl, setUseNl] = useState(false);
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [rails, setRails] = useState<HomeRail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cityLabel = useMemo(
    () =>
      cities.find(
        (c) =>
          normalizeCityKey(c.key || c.city) === normalizeCityKey(loc.city),
      )?.displayName ?? cityDisplayName(loc.city),
    [cities, loc.city],
  );
  const communityOptions = useMemo(
    () => communitiesForCity(loc.city),
    [loc.city],
  );
  const radiusOptions = useMemo(
    () => radiusOptionsForCity(cityLabel),
    [cityLabel],
  );

  useEffect(() => {
    setLoc(loadDiscoveryLocation());
    void listRegions()
      .then((items) => {
        setCities(items);
        if (!items.length) return;
        const saved = loadDiscoveryLocation();
        const match =
          items.find(
            (c) =>
              normalizeCityKey(c.key || c.city) ===
              normalizeCityKey(saved.city),
          ) ??
          items.find((c) => normalizeCityKey(c.key || c.city) === "lagos") ??
          items[0];
        if (match) {
          const next = {
            ...saved,
            city: normalizeCityKey(match.key || match.city),
          };
          setLoc(next);
          saveDiscoveryLocation(next);
        }
      })
      .catch(() => undefined);
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
            city: cityDisplayName(location.city),
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
    if (loc.city) params.set("city", cityDisplayName(loc.city));
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
              placeholder={`Search ${cityLabel}…`}
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
          <Link
            href="/ask"
            className="hidden text-sm font-medium text-[var(--rw-ink-muted)] hover:text-[var(--rw-ink)] md:inline"
          >
            Ask
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
            {cityLabel}, your unused things are worth something.
          </p>
          <nav
            aria-label="AI & platform tools"
            className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm font-medium"
          >
            <Link
              href="/ask"
              className="text-[var(--rw-accent)] underline-offset-2 hover:underline"
            >
              Ask ReWorth
            </Link>
            <Link
              href="/room-scan"
              className="text-[var(--rw-accent)] underline-offset-2 hover:underline"
            >
              Room scan
            </Link>
            <Link
              href="/worth"
              className="text-[var(--rw-accent)] underline-offset-2 hover:underline"
            >
              What&apos;s it worth
            </Link>
            <Link
              href="/consign"
              className="text-[var(--rw-accent)] underline-offset-2 hover:underline"
            >
              Consign
            </Link>
          </nav>
        </section>

        <section
          aria-label="Location"
          className="mt-6 space-y-3 rounded-[var(--rw-radius-lg)] border border-[var(--rw-border)] bg-[var(--rw-bg-elevated)]/80 p-3 sm:p-4"
        >
          <div>
            <p className="text-sm font-semibold tracking-tight">
              Where are you shopping?
            </p>
            <p className="mt-0.5 text-xs text-[var(--rw-ink-muted)] sm:text-sm">
              Pilot cities: Lagos and Abuja. Pick a city, then a community or
              keep it city-wide.
            </p>
          </div>

          <div
            className="grid grid-cols-2 gap-2"
            role="group"
            aria-label="Pilot city"
          >
            {(cities.length
              ? cities
              : [
                  { key: "lagos", displayName: "Lagos" },
                  { key: "abuja", displayName: "Abuja" },
                ]
            ).map((c) => {
              const key = normalizeCityKey(c.key || c.city);
              const selected = key === normalizeCityKey(loc.city);
              const areas = communitiesForCity(key)
                .filter((a) => !a.startsWith("Other"))
                .slice(0, 4)
                .join(" · ");
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    const allowed = communitiesForCity(key);
                    const community =
                      loc.community &&
                      (allowed as readonly string[]).includes(loc.community)
                        ? loc.community
                        : "";
                    updateLoc({ ...loc, city: key, community });
                  }}
                  aria-pressed={selected}
                  className={[
                    "rounded-[var(--rw-radius)] border px-3 py-3 text-left transition",
                    selected
                      ? "border-[var(--rw-accent)] bg-[var(--rw-accent-muted,rgba(217,106,50,0.08))]"
                      : "border-[var(--rw-border)] bg-[var(--rw-bg)] hover:border-[var(--rw-ink-muted)]",
                  ].join(" ")}
                >
                  <span className="block text-sm font-semibold sm:text-base">
                    {c.displayName || c.key}
                  </span>
                  <span className="mt-1 block text-[11px] leading-snug text-[var(--rw-ink-muted)] sm:text-xs">
                    {areas}
                    {selected ? " · Selected" : ""}
                  </span>
                </button>
              );
            })}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--rw-ink-muted)]">
              Community in {cityLabel}
            </label>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              <Chip
                selected={!loc.community}
                onClick={() => updateLoc({ ...loc, community: "" })}
              >
                All {cityLabel}
              </Chip>
              {communityOptions.map((name) => (
                <Chip
                  key={name}
                  selected={loc.community === name}
                  onClick={() => updateLoc({ ...loc, community: name })}
                >
                  {name}
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-medium text-[var(--rw-ink-muted)]">
              Distance
            </p>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Radius">
              {radiusOptions.map((opt) => (
                <Chip
                  key={String(opt.value)}
                  selected={loc.radiusKm === opt.value}
                  onClick={() => updateLoc({ ...loc, radiusKm: opt.value })}
                >
                  {opt.label}
                </Chip>
              ))}
            </div>
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
              : categories.map((cat) => {
                  const icon = categoryBrandIcon(cat.name);
                  return (
                    <Link
                      key={cat.id}
                      href={`/search?categoryId=${encodeURIComponent(cat.id)}`}
                      className="shrink-0"
                    >
                      <Chip className="inline-flex items-center gap-2">
                        {icon ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={icon}
                            alt=""
                            width={18}
                            height={18}
                            className="h-[18px] w-[18px] object-contain"
                          />
                        ) : null}
                        {cat.name}
                      </Chip>
                    </Link>
                  );
                })}
          </div>
        </section>

        <section
          aria-label="Trust"
          className="mt-4 flex flex-wrap gap-2 text-[var(--rw-ink-muted)]"
        >
          {(
            [
              ["Buyer protection", brandPublic.buyerProtection],
              ["Secure payment", brandPublic.securePayment],
              ["Safe meetup", brandPublic.safeMeetup],
              ["Verified sellers", brandPublic.verifiedSeller],
            ] as const
          ).map(([label, src]) => (
            <span
              key={label}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--rw-border)] bg-[var(--rw-bg-elevated)] px-2.5 py-1 text-xs font-medium"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" width={16} height={16} className="h-4 w-4 object-contain" />
              {label}
            </span>
          ))}
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
