# Phase 3.1 plan — AI & Platform Services (`v2.0-ai-assistant`)

**Roles:** Architect · Backend · AI · Frontend · Ops · QA  
**PRD:** §25 future search, §52–53

## Decisions
1. **Instant Buy** = platform-fulfilled BIN (pickup + delivery + SLA), not warehouse purchase (backlog deferred).
2. **City scope** = existing `Listing.city` / `DEFAULT_CITY` (Lagos-first); full multicity config is Prompt 3.2.
3. **AssistantProvider** adapter with mock + optional OpenAI; mutations require confirm tokens; audit every tool call.
4. **RoomScanVisionProvider** mock returns fixed PRD 6-item fixture for determinism.
5. **FulfilmentService** platform ops adapter drives Instant Buy SLA + managed pickup slots (WAT).

## Deliverables
Schema · assistant · room-scan · valuation product · Instant Buy · consignment · managed pickup · UI · tests · tag
