# Phase status

| Field | Value |
| --- | --- |
| Current phase | **9 — Risk, Moderation & Security** |
| Prompt | Prompt 10 |
| Target tag | `v0.9-risk-security` |
| Branch | `phase-9-risk-security` |
| Status | **Complete (pending PR merge / tag)** |
| Last updated | 2026-09-13 |

## What exists (Phase 9)

### Risk engine
- Weighted `RiskRule` table + `RiskEngineService` (duplicate image, low price, rapid listing, reported user, device fingerprint, cancellations, suspicious payment, off-platform chat, location jump)
- Per-user/listing Low/Med/High; HIGH → under_review + fraud queue + enhanced verification + support ticket
- `RiskAssessment.rulesFired` explainability

### Moderation
- Prohibited keyword taxonomy; mock image NSFW adapter; publish pipeline → reject / under_review
- Appeals → admin queue (`/admin/appeals`)

### Security & privacy
- Helmet CSP/headers; named rate limits; Zod boundary helpers; `pnpm audit --prod` CI (critical)
- `docs/SECURITY.md`, `docs/PRIVACY.md`, `docs/PERF.md`
- DSAR: `GET /me/export`, consents, delete+pseudonymise; web/mobile privacy settings

### Perf
- `infra/k6/mixed-load.js` + `phase9-500vu-gate.js` (500 VU); Lighthouse CI config on web
- Local single-node cannot meet p95 budget at 500 open VUs — staging re-run in Phase 10

## Resume point
**Phase 9 complete.** Next: **Phase 10 — UAT & launch readiness** (`v0.9.0-rc`).

```
Continue: resume Phase 10 from docs/PHASE_STATUS.md. Re-read AGENTS.md and
PRD.md, verify the last commit's tests still pass, then continue the plan.
```
