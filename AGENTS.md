# AGENTS.md — ReWorth living context

> Update this file after every phase. Resume point of truth with `docs/PHASE_STATUS.md`.

## Overview

**ReWorth** is a consumer recommerce marketplace (**buy · sell · swap · give away**) launching in **Lagos, Nigeria** (multi-city via region config).

- Tagline: *"Lagos, your unused things are worth something."*
- **Conflict rule:** Product → `PRD.md`. Engineering → `CURSOR-PROMPT.md` / `CURSOR-PROMPT-PHASE2-3.md`.

## Current phase

| Field | Value |
| --- | --- |
| Phase | **Post-launch series complete** |
| Last completed | **3.2 — B2B & Expansion** (`v2.1-expansion`, PR #16) |
| Status | **Shipped** |
| Next | Ops hardening / city launches via CITY_PLAYBOOK (config-only) |

## MVP / post-launch

Shipped through `v2.1-expansion`: swap → communities → intelligence → verticals → AI → B2B/expansion.

## Known gaps

- Expo push mock; staging k6 certification; pen-test / NDPR / store sign-offs
- Cross-border: ADR-007 design only; next cities (e.g. Ibadan) via config + seed only

See `docs/PHASE_STATUS.md`, `docs/CITY_PLAYBOOK.md`, `docs/ADRS/008-region-config.md`.
