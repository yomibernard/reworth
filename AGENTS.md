# AGENTS.md — ReWorth living context

> Update this file after every phase. Resume point of truth with `docs/PHASE_STATUS.md`.

## Overview

**ReWorth** is a consumer recommerce marketplace (**buy · sell · swap · give away**) launching in **Lagos, Nigeria** (multi-city via region config).

- Tagline: *"Lagos, your unused things are worth something."*
- **Conflict rule:** Product → `PRD.md`. Engineering → `CURSOR-PROMPT.md` / `CURSOR-PROMPT-PHASE2-3.md`.

## Mobile-first doctrine

- **Primary product surface:** iOS + Android (`apps/mobile`, Expo).
- **Web** (`apps/web`) is a **responsive companion** — browse, search, listing detail, checkout — not the lead surface.
- **Admin** (`apps/admin`) is ops-only; out of scope for mobile parity.
- **Every feature** is designed, built, and tested mobile-first.
- **Build order within every phase:** mobile (iOS + Android) → web parity.
- **Web parity** ships in-phase **or** is explicitly listed under Known gaps / `docs/MOBILE_PARITY.md` — never silently skipped.

## Definition of Done

Functional · UX · **mobile behaviour verified on iOS + Android; web parity delivered or tracked in known gaps** · security · analytics · error/loading/empty states · a11y · tests · docs · PO acceptance. (PRD §59, mobile-first amendment.)

## Current phase

| Field | Value |
| --- | --- |
| Phase | **Design elevation** `v1.0.3-design-elevation` (completion pass) |
| Last completed (post-launch) | **3.3** (`v2.2-monetization`) |
| MVP Admin | **`v0.8-admin`** (+ harden) |
| MVP Risk / Security | **`v0.9-risk-security`** (+ harden) |
| Status | **Near complete** — tokens + brand assets + Maestro stubs ready; device recording / staging k6 / Termii keys remain |
| Next | Maestro ≤60s device recording; staging k6 re-gate; Termii live keys |

## MVP / post-launch

MVP: scaffold → … → trust (`v0.7`) → **admin (`v0.8-admin`)** → risk (`v0.9`) → RC.  
Post-launch through `v2.2-monetization`: swap → communities → intelligence → verticals → AI → B2B/expansion → monetization.

## Known gaps

- Real device Maestro ≤60s recording still open (`e2e/mobile/00_demo_60s.yaml` + README; testIDs on OTP/Sell)
- Staging k6 p95 certification; pen-test / NDPR / store sign-offs
- Cross-border: ADR-007 design only; next cities via config + seed (pilot = Lagos + Abuja; PH/Ibadan supply)
- Promoted search self-serve later (ADR-009 admin-assigned)
- Payments still mock-default in local (Paystack adapter present)
- Termii live SMS/WhatsApp keys still pending (dual-channel mock verified)

See `docs/PHASE_STATUS.md`, `docs/BUYER_JOURNEY_AUDIT.md`, `docs/METRICS.md`, `docs/ADRS/009-promoted-search-admin.md`.
