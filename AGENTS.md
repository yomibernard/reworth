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
| Phase | **3.3 — Monetization & Marketplace Economics** |
| Last completed | **3.3** (`v2.2-monetization`) |
| Status | **Shipped** (pending merge/tag if PR open) |
| Next | Ops hardening / city launches via CITY_PLAYBOOK; close MOBILE_PARITY web companion gaps for Boost/Plus |

## MVP / post-launch

Shipped through `v2.2-monetization`: swap → communities → intelligence → verticals → AI → B2B/expansion → monetization.

## Known gaps

- Expo push mock; staging k6 certification; pen-test / NDPR / store sign-offs
- Cross-border: ADR-007 design only; next cities via config + seed
- Web companion for Boost / Featured / Seller Plus (mobile full — see `docs/MOBILE_PARITY.md`)
- Promoted search self-serve later (ADR-009 admin-assigned)

See `docs/PHASE_STATUS.md`, `docs/BUYER_JOURNEY_AUDIT.md`, `docs/METRICS.md`, `docs/ADRS/009-promoted-search-admin.md`.
