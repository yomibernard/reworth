# City playbook — national expansion

> Phase 3.2 (`v2.1-expansion`). Supply-first launch; cities are **config**, not hard-coded.

## Related ADRs

- [`docs/ADRS/008-region-config.md`](ADRS/008-region-config.md) — region JSON schema, Lagos / Abuja / Port Harcourt + Ibadan config-only proof *(API agent)*
- [`docs/ADRS/007-cross-border-recommerce.md`](ADRS/007-cross-border-recommerce.md) — export interfaces only; **no** purchase UI *(API agent)*

If those ADR files are missing in a branch, treat this playbook + `config/regions/*.json` as the interim contract.

## Required config keys (`config/regions/<city>.json`)

| Key | Purpose |
| --- | --- |
| `key` | Stable city id (e.g. `Lagos`, `Abuja`) |
| `displayName` | UI label |
| `timezone` | Default `Africa/Lagos` |
| `communities[]` | Focus areas for discovery / sell chips |
| `geocoding` | Lat/lng fixtures per community |
| `logistics.baseFeeKobo` / `perKmKobo` | Delivery quote inputs |
| `priceBands` | Valuation / comps bands |
| `smsEnabled` / `pspEnabled` | Feature flags per market |

Validate with `node scripts/validate-city-config.mjs` (when present).

## Ops rota (stub)

1. Confirm founding-seller density before enabling a city flag.
2. Seed communities + circular partners for the city.
3. Smoke: search, delivery quote, SMS OTP, Paystack mock.
4. Announce in CHANGELOG under the expansion tag.

## Web surfaces

- `GET /regions` drives optional city pickers on Account, Sell, Corporate.
- Corporate relocation projects use `cityFrom` / `cityTo` from the same list.
