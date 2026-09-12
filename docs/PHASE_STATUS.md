# Phase status

| Field | Value |
| --- | --- |
| Current phase | **0 — Foundations** |
| Prompt | Prompt 1 (`CURSOR-PROMPT.md`) |
| Target tag | `v0.0-scaffold` |
| Branch | `phase-0-foundations` |
| Status | **Complete (pending PR merge)** |
| Last updated | 2026-09-12 |

## What exists

- Prompt package: `PRD.md`, `CURSOR-PROMPT.md`, `CURSOR-PROMPT-PHASE2-3.md`, `AGENTS.md`, `.cursor/rules/*`, ADRs, doc stubs
- Turborepo + pnpm monorepo: `apps/api|web|admin|mobile`, `packages/shared|ui-web|config`
- Infra: `infra/docker-compose.yml` (postgres:16, redis:7, minio, opensearch, mailhog), `infra/k6/health-smoke.js`
- CI: `.github/workflows/ci.yml` (lint → typecheck → test → build)
- Design system `@reworth/ui-web`: tokens + Button (SELL), ListingCard, Input, Chip, BottomNav, Modal, Toast, Skeleton, EmptyState
- API: `/api/v1/healthz`, `/readyz`, `/metrics` + provider interface/mock stubs
- Web landing: ReWorth + tagline + SELL CTA
- Admin shell (Phase 8 placeholder); mobile Expo bottom-nav shell
- Verified locally: `pnpm install`, typecheck, unit tests (4), build api/web/admin, **GET /api/v1/healthz → { status: ok }**

## Known gaps / environment notes

- Docker Desktop was **not running** on the implementer’s machine — compose not verified live; configs are present. Start Docker then `docker compose -f infra/docker-compose.yml up -d` for full readyz DB/Redis checks.
- Auth, listings, payments, etc. start at Phase 1+
- Full PRD §36 analytics deferred
- Prisma schema is empty (domain models Phase 1+)
- Strict ESLint flat configs deferred (lint scripts are placeholders; typecheck + tests gate CI)

## Exact resume point

**Phase 0 DoD met for code.** Next user instruction should be **Prompt 2 / Phase 1** (Accounts, Auth & Identity) → tag `v0.1-auth`.

If merging first: merge PR `phase-0-foundations` → `main`, then tag `v0.0-scaffold`.

## Resume cheat sheet

```
Continue: resume Phase N from docs/PHASE_STATUS.md. Re-read AGENTS.md and
PRD.md, verify the last commit's tests still pass, then continue the plan. Do not restart completed work.
```

**MVP tags:** `v0.0-scaffold` · `v0.1-auth` · `v0.2-listings` · `v0.3-discovery` · `v0.4-chat-offers` · `v0.5-orders-payments` · `v0.6-logistics-notifications` · `v0.7-trust` · `v0.8-admin` · `v0.9-risk-security` · `v0.9.0-rc`

**Post-launch:** only after entry gate in `CURSOR-PROMPT-PHASE2-3.md` — `v1.0` … `v2.1`
