# ReWorth

Lagos-first consumer recommerce marketplace — **buy · sell · swap · give away**.

> *Lagos, your unused things are worth something.*

**Release:** [`v0.9.0-rc`](CHANGELOG.md) — see [`docs/MVP_STATUS.md`](docs/MVP_STATUS.md).

## Docs

| File | Purpose |
| --- | --- |
| [`PRD.md`](PRD.md) | Product requirements |
| [`AGENTS.md`](AGENTS.md) | Living engineering context |
| [`docs/PHASE_STATUS.md`](docs/PHASE_STATUS.md) | Resume / current phase |
| [`docs/UAT.md`](docs/UAT.md) | §58 acceptance checklist |
| [`docs/DEMO.md`](docs/DEMO.md) | 10-minute demo script |
| [`docs/LAUNCH.md`](docs/LAUNCH.md) | Launch checklist |
| [`docs/RUNBOOK.md`](docs/RUNBOOK.md) | Incident playbooks |
| [`docs/API.md`](docs/API.md) | REST `/api/v1` |
| [`CHANGELOG.md`](CHANGELOG.md) | Release notes |

## 10-minute local run

Prerequisites: **Node 20+**, **pnpm 9**, **Docker Desktop**.

```bash
# 1. Env
cp .env.example .env

# 2. Install
pnpm install

# 3. Infra
docker compose -f infra/docker-compose.yml up -d

# 4. Migrate + seed
pnpm --filter @reworth/api exec prisma migrate deploy
pnpm --filter @reworth/api prisma:seed
pnpm seed:staging
# Fast demos only: SEED_STAGING_SKIP_HEAVY=1 pnpm seed:staging

# 5. Dev
pnpm dev
```

| Surface | URL |
| --- | --- |
| Web | http://localhost:3000 |
| API | http://localhost:3001/api/v1/healthz |
| Admin | http://localhost:3002 |

**Demo login:** Ori `ori@demo.reworth.ng` / `DemoOri!2026` — walkthrough in [`docs/DEMO.md`](docs/DEMO.md).

```bash
# Golden-path e2e (skips if API down)
pnpm exec playwright install chromium
pnpm test:e2e
```

## Stack

Expo · Next.js 15 · NestJS · PostgreSQL/Prisma · Redis/BullMQ · MinIO · OpenSearch · Paystack · Termii/Twilio · OpenAI — see ADR-001.

## License

Proprietary — all rights reserved.
