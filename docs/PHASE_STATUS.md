# Phase status

| Field | Value |
| --- | --- |
| Current phase | **2.2 — Moving Sales + Estate Communities** |
| Prompt | Post-launch 2.2 |
| Target tag | `v1.1` |
| Status | **Not started** |
| Last completed | **2.1** `v1.0-swap` (PR #11 merged) |
| Last updated | 2026-09-13 |

## What exists (through 2.1)
- SwapProposal + GiveawayClaim + Order.transactionType / dual legs (ADR-003)
- API: proposals, claims, order leg hand-over/confirm/fail
- Web: PDP Swap + Claim CTAs, proposal modal, seller claims page
- Mobile: Swap sheet (live listing picker + cash) + Claim CTA
- Tests: `swap.spec.ts` (pure swap zero payments, cash, counter, giveaway race, expiry)

## Resume
Start Prompt 2.2 Moving Sales + Estate Communities (`v1.1`).
