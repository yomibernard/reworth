# AGENTS.md — ReWorth living context

> Update this file after every phase. Resume point of truth with `docs/PHASE_STATUS.md`.

## Overview

**ReWorth** is a consumer recommerce marketplace (**buy · sell · swap · give away**) launching in **Lagos, Nigeria**.

- Tagline: *"Lagos, your unused things are worth something."*
- **Conflict rule:** Product → `PRD.md`. Engineering → `CURSOR-PROMPT.md` / `CURSOR-PROMPT-PHASE2-3.md`.

## Current phase

| Field | Value |
| --- | --- |
| Phase | **2.4 — Verticals & Commercial** |
| Prompt | Post-launch 2.4 |
| Target tag | `v1.3-verticals` |
| Status | **Complete (pending PR merge)** |
| Last completed | **2.3 — Intelligence** (`v1.2-intelligence`) |
| Next | Prompt 3.1 AI (`v2.0`) after merge |

## MVP / post-launch

MVP through `v0.9.0-rc`. Shipped: `v1.0-swap`, `v1.1-moving-communities`, `v1.2-intelligence`. Next: tag `v1.3-verticals` after PR merge.

## Known gaps

- Expo push mock; staging k6 certification; pen-test / NDPR / store sign-offs
- CF/MF RecProvider swap deferred (ADR-004 interface ready)
- Production `/@handle` vanity rewrite to `/u/:handle` (documented in next.config)

See `docs/PHASE_STATUS.md`, `docs/ADRS/005-luxury-auth-order-status.md`.
