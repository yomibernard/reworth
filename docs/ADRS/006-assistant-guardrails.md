# ADR-006: Assistant guardrails (confirm + audit)

- **Status:** Accepted
- **Date:** 2026-09-13
- **Deciders:** Solution Architect, AI Lead, Backend Lead, Security (Phase 3.1)

## Context

Ask ReWorth (marketplace assistant) can search inventory, build budget bundles, surface valuations, and propose mutations (save bundle, draft listings, book pickup, consign). Without guardrails, a chat agent could move money-adjacent state or publish inventory from a single message.

## Decision

1. **Read-only money default** — Search, bundle preview, and valuation tools return data only. They do not create orders, charge cards, or release escrow. Payments stay on existing Paystack / mock PSP checkout (ADR-002).
2. **Confirm mutations** — Any write that persists inventory, bookings, or saved bundles returns `{ actionId, confirmToken, summary }`. The client must call `POST /assistant/sessions/:id/confirm` after an explicit Confirm control. Soft-delete / cancel paths follow the same pattern when initiated from chat.
3. **Audit every tool call** — Persist `AssistantActionLog` rows (tool name, input/output, confirmed flag, latency, degraded flag). Ops can reconstruct “what the assistant did” for support and abuse review.
4. **Grounding brief** — Prompt/UI grounding lives in `apps/web/lib/assistant.ts` as `ASSISTANT_GROUNDING_BRIEF`. Server Q&A strings live in `apps/api/src/assistant/help-docs.ts`. Docs and help cite those rather than duplicating free-form policy.

## Consequences

- Web Ask UI always shows Confirm for `mutation_pending` / bundle-save tool results.
- Mock AssistantProvider must emit confirm tokens for mutation tools so demos match production.
- Room scan draft publish and Instant Buy checkout remain separate product surfaces (not silent chat side-effects).

## References

- PRD §53 · `CURSOR-PROMPT-PHASE2-3.md` Prompt 3.1 · `docs/PHASE_3_1_PLAN.md`
- Schema: `AssistantSession`, `AssistantMessage`, `AssistantActionLog`, `SavedBundle`
