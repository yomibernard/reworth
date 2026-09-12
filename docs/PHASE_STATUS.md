# Phase status

| Field | Value |
| --- | --- |
| Current phase | **1 — Accounts, Auth & Identity** |
| Prompt | Prompt 2 (`CURSOR-PROMPT.md`) |
| Target tag | `v0.1-auth` |
| Branch | `phase-1-auth` |
| Status | **Complete (pending PR merge)** — code + tests green; migrate/seed needs Postgres |
| Last updated | 2026-09-12 |

## What exists (Phase 1)

### API
- Prisma models: User, Profile, Address, Verification, Device, RefreshToken, OtpChallenge, AuditLog, UserRole
- Nest modules: `prisma`, `auth`, `users`, `identity`, `admin`, `audit` + JWT/RBAC guards
- Endpoints under `/api/v1`: OTP, login, refresh/logout, OAuth mock, `/me/*`, `/verifications`, `/admin/*`
- Console SMS mock via `SMS_PROVIDER`; identity mock via `IDENTITY_PROVIDER=mock`
- Seed: Super Admin from `ADMIN_SUPER_EMAIL` / `ADMIN_SUPER_PASSWORD`
- RBAC matrix: [`docs/RBAC.md`](RBAC.md)
- Unit tests: **19 passed** (OTP limits, refresh reuse, OAuth mock, RBAC Support≠Finance, L3 no raw ID, profile privacy, health)

### Clients
- **Web**: `/onboarding` → phone → OTP → profile; `/account`; SELL → onboarding
- **Admin**: `/login` + role-gated dashboard shell
- **Mobile**: onboarding stack + Profile tab with verification/sign-out

### Plan
- [`docs/PHASE_1_PLAN.md`](PHASE_1_PLAN.md)

## Required local steps (Postgres)

```bash
docker compose -f infra/docker-compose.yml up -d postgres redis
cd apps/api
pnpm exec prisma migrate deploy
pnpm exec prisma db seed
pnpm --filter @reworth/api start
# Web: pnpm --filter @reworth/web dev → http://localhost:3000/onboarding
```

OTP codes are printed by the console SMS mock in API logs.

## Known gaps

- Live migrate/seed not verified if Docker Desktop is stopped
- Admin TOTP 2FA UI placeholder only (not enforced)
- Tokens in localStorage/AsyncStorage (interim; httpOnly cookies later)
- Avatar upload deferred to Media (Phase 2)

## Exact resume point

**Phase 1 code complete.** Next: **Phase 2 — Listings, Media & AI-Assisted Listing** (`v0.2-listings`) after merge + tag `v0.1-auth`.

## Resume cheat sheet

```
Continue: resume Phase 2 from docs/PHASE_STATUS.md. Re-read AGENTS.md and
PRD.md, verify the last commit's tests still pass, then continue the plan. Do not restart completed work.
```
