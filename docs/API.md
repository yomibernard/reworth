# API documentation (stub)

> OpenAPI-derived docs will be generated from `apps/api` in later phases. Do not treat this file as complete until Phase 10 regenerates it.

## Base URL (local)

`http://localhost:3001/api/v1`

## Planned surface (PRD §43)

Versioned REST under `/api/v1`. Admin routes separately authorised.

### Health (Phase 0)

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/healthz` | Liveness |
| GET | `/readyz` | Readiness (deps) |
| GET | `/metrics` | Metrics stub |

### Auth / users (Phase 1+)

See `CURSOR-PROMPT.md` Prompt 2 for the endpoint list (`/auth/otp/*`, `/me`, verifications, admin users).

### Listings / search / chat / orders / payments

Added in Phases 2–6. This stub will be replaced by generated OpenAPI examples.
