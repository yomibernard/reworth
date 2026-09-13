# AGENTS.md — ReWorth living context

> Update this file after every phase. Resume point of truth with `docs/PHASE_STATUS.md`.

## Overview

**ReWorth** is a consumer recommerce marketplace (**buy · sell · swap · give away**) launching in **Lagos, Nigeria** (Lekki, Ikoyi, Victoria Island, Oniru, VGC, Chevron, Ajah and surrounding communities).

- Signature UX: photograph an item → AI-assisted draft → **live in ~60 seconds**.
- Tagline: *"Lagos, your unused things are worth something."*
- Ambition: Nigeria's leading recommerce ecosystem (PRD §60).

**Conflict rule:** Product → [`PRD.md`](PRD.md). Engineering & build order → [`CURSOR-PROMPT.md`](CURSOR-PROMPT.md) / [`CURSOR-PROMPT-PHASE2-3.md`](CURSOR-PROMPT-PHASE2-3.md).

## Current phase

| Field | Value |
| --- | --- |
| Phase | **10 — UAT / RC** |
| Prompt | Prompt 11 |
| Target tag | `v0.9.0-rc` |
| Status | **Merged** (PR #10) |
| Next | Post-launch (entry gate: stable RC) |

## 14-role team

Operate as this team; attribute deliverables to a role.

| Role | Owns |
| --- | --- |
| Product Owner | Scope, AC, DoD sign-off, phase reports |
| Solution Architect | Design, ADRs, module boundaries |
| Backend Lead (NestJS) | API, domain, jobs, tests |
| Frontend Engineer (Next.js) | Web storefront |
| Mobile Engineer (Expo) | iOS + Android |
| Database Engineer | Prisma/Postgres, OpenSearch, seed |
| AI/ML Engineer | Listing assist, search NL, scanning |
| Payments Engineer | Paystack escrow, webhooks, payouts |
| DevOps / Platform | Compose, CI/CD, observability |
| QA Lead | Suites, e2e, UAT |
| Security Engineer | §44–45, threat reviews |
| UX/UI Designer | Design system, a11y |
| Data Analyst | PRD §36 events & metrics |
| Ops / Support Lead | Admin workflows, runbooks |

## Baked-in stack

| Area | Decision |
| --- | --- |
| Mobile | React Native + Expo |
| Web + Admin | Next.js 15 App Router, TS, Tailwind |
| API | NestJS modular monolith, REST `/api/v1` |
| DB | PostgreSQL 16 + Prisma; Redis + BullMQ |
| Media | S3-compatible (MinIO), presigned uploads |
| Search | OpenSearch + Postgres FTS fallback |
| Auth | JWT + phone OTP + Google/Apple OAuth |
| SMS | Termii or Twilio + console mock |
| Payments | Paystack + mock PSP (escrow-shaped) |
| AI | OpenAI GPT-4o default + rule-based mock |
| Locale | NGN, en-NG, WAT |

See [`docs/ADRS/001-stack-modular-monolith.md`](docs/ADRS/001-stack-modular-monolith.md).

## Monorepo map (target)

```
apps/api        NestJS — /api/v1
apps/web        Next.js — public storefront
apps/admin      Next.js — operations portal
apps/mobile     Expo — iOS + Android
packages/shared DTOs, enums, NGN/geo helpers
packages/ui-web Design system (tokens + components)
packages/config eslint / tsconfig / prettier
infra/          docker-compose, k6
docs/           API, runbooks, ADRs, phase status
e2e/            Playwright web + Maestro mobile
```

## How to run (10 minutes)

```bash
pnpm install
docker compose -f infra/docker-compose.yml up -d
pnpm --filter @reworth/api exec prisma migrate deploy
pnpm --filter @reworth/api prisma:seed
pnpm seed:staging
pnpm dev
# API   http://localhost:3001/api/v1/healthz
# Web   http://localhost:3000
# Admin http://localhost:3002
```

Copy `.env.example` → `.env` first. Never commit real secrets. Demo accounts: [`docs/DEMO.md`](docs/DEMO.md).

## Definition of Done

Per **PRD §59**: functional · UX · responsive · security · analytics · error/loading/empty · a11y · tests · docs · PO acceptance.

## Phase plan & tags

### MVP (`CURSOR-PROMPT.md`)

| Phase | Tag | Name |
| --- | --- | --- |
| 0 | `v0.0-scaffold` | Foundations |
| 1 | `v0.1-auth` | Accounts, auth, identity |
| 2 | `v0.2-listings` | Listings, media, AI listing |
| 3 | `v0.3-discovery` | Home, search, favourites |
| 4 | `v0.4-chat-offers` | Chat + offers |
| 5 | `v0.5-orders-payments` | Orders, escrow, disputes |
| 6 | `v0.6-logistics-notifications` | Logistics + notifications |
| 7 | `v0.7-trust` | Reviews + trust score |
| 8 | `v0.8-admin` | Admin portal |
| 9 | `v0.9-risk-security` | Risk, moderation, hardening |
| 10 | `v0.9.0-rc` | UAT + launch readiness |

### Post-launch (`CURSOR-PROMPT-PHASE2-3.md` — entry gate required)

| Prompt | Tag | Focus |
| --- | --- | --- |
| 2.1 | `v1.0` | Swap + Give-Away |
| 2.2 | `v1.1` | Moving Sales + Estate Communities |
| 2.3 | `v1.2` | Intelligence |
| 2.4 | `v1.3` | Verticals & commercial |
| 3.1 | `v2.0` | AI & platform services |
| 3.2 | `v2.1` | B2B & expansion |

## Known gaps

**MVP RC (`v0.9.0-rc`)** — UAT checklist, staging seed, launch/runbook docs, golden-path e2e. See [`docs/MVP_STATUS.md`](docs/MVP_STATUS.md).

Still not built / external:

- Expo/FCM push (mock only)
- TOTP enforcement for all admins (optional policy)
- Staging k6 p95 certification
- All PRD §51–53 / post-launch features ([`docs/BACKLOG_PHASE2.md`](docs/BACKLOG_PHASE2.md))
- Production credentials, pen test, NDPR counsel, store submissions; httpOnly token cookies

Track resume detail in [`docs/PHASE_STATUS.md`](docs/PHASE_STATUS.md).

## Key links

| Doc | Purpose |
| --- | --- |
| [`PRD.md`](PRD.md) | Product requirements (60 sections) |
| [`CURSOR-PROMPT.md`](CURSOR-PROMPT.md) | MVP Prompts 1–11 |
| [`CURSOR-PROMPT-PHASE2-3.md`](CURSOR-PROMPT-PHASE2-3.md) | Post-launch 2.1–3.2 |
| [`docs/PHASE_STATUS.md`](docs/PHASE_STATUS.md) | Resume cheat sheet |
| [`docs/MVP_STATUS.md`](docs/MVP_STATUS.md) | §50 status table |
| [`docs/ADRS/`](docs/ADRS/) | Architecture decisions |
| [`.cursor/rules/`](.cursor/rules/) | Cursor agent rules |
