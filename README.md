# ReWorth

Lagos-first consumer recommerce marketplace — **buy · sell · swap · give away**.

> *Lagos, your unused things are worth something.*

## Docs

| File | Purpose |
| --- | --- |
| [`PRD.md`](PRD.md) | Product requirements (v1.0, 60 sections) |
| [`AGENTS.md`](AGENTS.md) | Living engineering context |
| [`CURSOR-PROMPT.md`](CURSOR-PROMPT.md) | MVP phase prompts 1–11 |
| [`CURSOR-PROMPT-PHASE2-3.md`](CURSOR-PROMPT-PHASE2-3.md) | Post-launch prompts |
| [`docs/PHASE_STATUS.md`](docs/PHASE_STATUS.md) | Current phase / resume |

## Current status

**Phase 0 — Foundations complete** (scaffold + healthz + landing). See `docs/PHASE_STATUS.md`. Next: Phase 1 Auth.

## How to run locally

Prerequisites: **Node 20+**, **pnpm 9**, **Docker Desktop** (for infra).

```bash
# 1. Env
cp .env.example .env
# Edit placeholders only — never commit real secrets

# 2. Install
pnpm install

# 3. Infra (requires Docker running)
docker compose -f infra/docker-compose.yml up -d

# 4. Dev (api + web + admin)
pnpm dev
```

| Surface | URL |
| --- | --- |
| Web | http://localhost:3000 |
| API health | http://localhost:3001/api/v1/healthz |
| Admin | http://localhost:3002 |

Mobile: `pnpm --filter @reworth/mobile dev` (Expo).

API alone: `pnpm --filter @reworth/api build && pnpm --filter @reworth/api start`

### Phase 6 — delivery demo

```bash
cd apps/api && pnpm exec prisma migrate deploy && pnpm exec prisma db seed
pnpm --filter @reworth/api demo:delivery
# Walks a funded DELIVERY order ASSIGNED → … → DELIVERED
```

## Stack (summary)

Expo · Next.js 15 · NestJS · PostgreSQL/Prisma · Redis/BullMQ · MinIO · OpenSearch · Paystack · Termii/Twilio · OpenAI — see `AGENTS.md` and ADR-001.

## License

Proprietary — all rights reserved.
