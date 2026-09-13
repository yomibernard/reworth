# AGENTS.md — ReWorth living context

> Update this file after every phase. Resume point of truth with `docs/PHASE_STATUS.md`.

## Overview

**ReWorth** is a consumer recommerce marketplace (**buy · sell · swap · give away**) launching in **Lagos, Nigeria**.

- Tagline: *"Lagos, your unused things are worth something."*
- **Conflict rule:** Product → `PRD.md`. Engineering → `CURSOR-PROMPT.md` / `CURSOR-PROMPT-PHASE2-3.md`.

## Current phase

| Field | Value |
| --- | --- |
| Phase | **2.3 — Intelligence** |
| Prompt | Post-launch 2.3 |
| Target tag | `v1.2-intelligence` |
| Status | **Complete (pending PR merge)** |
| Last completed | **2.2 — Moving Sales + Estate Communities** (`v1.1-moving-communities`) |
| Next | Prompt 2.4 — Verticals (`v1.3`) after merge |

## MVP / post-launch

MVP through `v0.9.0-rc`. Shipped: `v1.0-swap`, `v1.1-moving-communities`. Next tag: `v1.2-intelligence`.

## Known gaps

- Expo push mock; staging k6 certification; pen-test / NDPR / store sign-offs
- Richer chat-thread swap actions; deeper mobile community UX
- CF/MF RecProvider swap deferred (ADR-004 interface ready)

See `docs/PHASE_STATUS.md`, `docs/RBAC.md`, `docs/EXPERIMENTS.md`, `docs/METRICS.md`.
