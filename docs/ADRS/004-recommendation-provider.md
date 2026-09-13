# ADR-004: Recommendation provider interface

- **Status:** Accepted
- **Date:** 2026-09-13
- **Deciders:** Solution Architect, Backend Lead, Data Analyst (Phase 2.3)

## Context

Home, PDP “Similar items”, and post-checkout rails need personalised ranking. Volume is still low for collaborative filtering (CF) or matrix factorisation (MF). We need a swappable scoring layer so we can ship weighted heuristics now and replace the implementation later without rewriting callers.

## Decision

Introduce a **`RecProvider`** interface:

```ts
recommend(ctx: {
  userId?: string;
  city: string;
  seed?: number;
  listingId?: string;
  limit: number;
  surface: 'home' | 'similar' | 'post_checkout';
}): Promise<PublicListingDto[]>;
```

- **v2 default:** `WeightedRecProvider` — recency + category/brand/price similarity + community affinity + seller trust; **hard city filter**; deterministic given `seed` for tests.
- Call sites (`RecommendationService`, `GET /recommendations`, home rail) depend only on the interface.
- Future **CF / MF** implementations register as alternate providers behind the same interface (feature flag or experiment variant), without changing DTO or web/mobile clients.
- A/B: experiment `rec_home_v2` (`control` vs `weighted_v2`) — see `docs/EXPERIMENTS.md`.

## Consequences

- Cold / anonymous traffic can fall back to popularity without a user feature vector.
- Provider swaps require an ADR only if the **contract** (surfaces, city scoping, DTO) changes — not for algorithm internals.
- Deterministic seeding keeps CI stable until CF needs approximate nearest-neighbour infra.

## References

- PRD §51 Phase Two · `CURSOR-PROMPT-PHASE2-3.md` Prompt 2.3
- `docs/EXPERIMENTS.md`
