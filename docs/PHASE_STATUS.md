# Phase status

| Field | Value |
| --- | --- |
| Current phase | **3 — Discovery: Home, Search & Favourites** |
| Prompt | Prompt 4 |
| Target tag | `v0.3-discovery` |
| Branch | `phase-3-discovery` |
| Status | **Complete (pending PR merge)** |
| Last updated | 2026-09-12 |

## What exists (Phase 3)

### API
- Favourite, SellerFollow, SavedSearch (+ migration `phase3_discovery`)
- SearchProvider: Postgres FTS/geo default; OpenSearch stub falls back
- `GET /search`, `POST /search/nl` (mock parser, 10 fixture tests)
- `GET /home` rails + Redis/memory cache (45s)
- Favourites / follows / saved searches under `/me/*`
- **51 unit tests** green

### Clients
- Web `/` discovery home, `/search`, `/my` (Items · Sellers · Searches)
- PDP Save → favourite; mobile Home/Discover/Saved

### Docs
- [`docs/PHASE_3_PLAN.md`](PHASE_3_PLAN.md)

## Local

```bash
cd apps/api && pnpm exec prisma migrate deploy && pnpm exec prisma db seed
pnpm dev
# Home http://localhost:3000 · Search /search · My /my
```

## Known gaps
- OpenSearch live indexing deferred (Postgres path is default)
- Lighthouse CI budgets not automated this phase (manual follow-up)
- Saved-search push alerts → post-MVP 2.3
- Moving Sales rail empty by design until Phase 2.2

## Resume point
**Phase 3 complete.** Next: **Phase 4 — Chat + Offers** (`v0.4-chat-offers`).

```
Continue: resume Phase 4 from docs/PHASE_STATUS.md. Re-read AGENTS.md and
PRD.md, verify the last commit's tests still pass, then continue the plan. Do not restart completed work.
```
