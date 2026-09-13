# AGENTS.md — ReWorth living context

> Update this file after every phase. Resume point of truth with `docs/PHASE_STATUS.md`.

## Overview

**ReWorth** is a consumer recommerce marketplace (**buy · sell · swap · give away**) launching in **Lagos, Nigeria**.

- Tagline: *"Lagos, your unused things are worth something."*
- **Conflict rule:** Product → `PRD.md`. Engineering → `CURSOR-PROMPT.md` / `CURSOR-PROMPT-PHASE2-3.md`.

## Current phase

| Field | Value |
| --- | --- |
| Phase | **3.1 — AI & Platform Services** |
| Prompt | Post-launch 3.1 |
| Target tag | `v2.0-ai-assistant` |
| Status | **Complete (pending PR merge)** |
| Last completed | **2.4 — Verticals** (`v1.3-verticals`) |
| Next | Prompt 3.2 B2B (`v2.1`) after merge |

## MVP / post-launch

MVP through `v0.9.0-rc`. Shipped: `v1.0-swap`, `v1.1-moving-communities`, `v1.2-intelligence`, `v1.3-verticals`. In flight / next tag: `v2.0-ai-assistant`.

## Known gaps

- Expo push mock; staging k6 certification; pen-test / NDPR / store sign-offs
- CF/MF RecProvider swap deferred (ADR-004); production `/@handle` → `/u/:handle` rewrite
- Mobile Ask is web deep-link stub only (full RN chat deferred)

See `docs/PHASE_STATUS.md`, `docs/ADRS/006-assistant-guardrails.md`.
