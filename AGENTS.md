# AGENTS.md — ReWorth living context

> Update this file after every phase. Resume point of truth with `docs/PHASE_STATUS.md`.

## Overview

**ReWorth** is a consumer recommerce marketplace (**buy · sell · swap · give away**) launching in **Lagos, Nigeria** (multi-city via region config).

- Tagline: *"Lagos, your unused things are worth something."*
- **Conflict rule:** Product → `PRD.md`. Engineering → `CURSOR-PROMPT.md` / `CURSOR-PROMPT-PHASE2-3.md`.

## Current phase

| Field | Value |
| --- | --- |
| Phase | **3.2 — B2B & Expansion** |
| Prompt | Post-launch 3.2 |
| Target tag | `v2.1-expansion` |
| Status | **Complete (pending PR merge)** |
| Last completed | **3.1 — AI** (`v2.0-ai-assistant`) |
| Next | Post-series complete after merge (or ops hardening) |

## MVP / post-launch

Shipped through `v2.0-ai-assistant`. This branch: corporate relocation, estate partners, circular hand-offs, region config.

## Known gaps

- Expo push mock; staging k6 certification; pen-test / NDPR / store sign-offs
- Cross-border: ADR-007 design only; Ibadan not in prod region bundle yet (config-only test proof)

See `docs/PHASE_STATUS.md`, `docs/CITY_PLAYBOOK.md`, `docs/ADRS/008-region-config.md`.
