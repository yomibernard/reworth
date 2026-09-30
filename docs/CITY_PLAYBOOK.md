# City playbook — national expansion

> Phase 3.2 (`v2.1-expansion`) + Mobile/Store/Ops track. Supply-first launch; cities are **config**, not hard-coded.

## Related ADRs

- [`docs/ADRS/008-region-config.md`](ADRS/008-region-config.md) — region JSON schema
- [`docs/ADRS/007-cross-border-recommerce.md`](ADRS/007-cross-border-recommerce.md) — export interfaces only

## Required config keys (`config/regions/<city>.json`)

| Key | Purpose |
| --- | --- |
| `city` | Stable city id (e.g. `lagos`, `abuja`) |
| `displayName` | UI label |
| `timezone` | Default `Africa/Lagos` |
| `status` | `pilot` (public picker) · `supply` (config-ready) · `disabled` |
| `communities[]` | Focus areas for discovery / sell chips |
| `geocoding` | Lat/lng fixtures per community |
| `logistics.baseFeeKobo` / `perKmKobo` | Delivery quote inputs |
| `priceBands` | Valuation / comps bands |
| `sms` / `psp` | `{ enabled, provider }` feature flags |

Validate: `pnpm validate:cities`

## Shipped cities

| City | File | Status | Notes |
| --- | --- | --- | --- |
| Lagos | `lagos.json` | **pilot** | Launch + active consumer pilot |
| Abuja | `abuja.json` | **pilot** | Dual-city pilot with Lagos |
| Port Harcourt | `port-harcourt.json` | supply | Config-ready; not in public picker |
| Ibadan | `ibadan.json` | supply | Ops track — supply-first before marketing |

**Consumer pilot:** `GET /regions` returns Lagos + Abuja only. Ops/full list: `GET /regions?all=1`. Override via `REGION_PILOT_CITIES=lagos,abuja`.

## Per-city ops runbook (PRD §57)

1. Confirm founding-seller density before marketing spend.
2. Seed communities + circular partners for the city (`Community.city` = region key).
3. Fraud watchlist seed + verification partner coverage note.
4. Support rota owner for the city (Slack/on-call).
5. Smoke: `pnpm validate:cities`, search, delivery quote, SMS OTP, Paystack mock, `k6 run scripts/k6/smoke.js`.
6. Announce in CHANGELOG.

## Surfaces

- `GET /regions` drives city pickers (web Account/Sell/Corporate; mobile Home + Profile) — **pilot = Lagos + Abuja**.
- Corporate relocation uses `cityFrom` / `cityTo` from the same list.
