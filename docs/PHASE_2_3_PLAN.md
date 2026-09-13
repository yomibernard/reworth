# Phase 2.3 plan — Intelligence (`v1.2-intelligence`)

**Roles:** Architect · Backend · Data Analyst · Frontend · QA  
**PRD:** §11, §25, §28, §51

## Decisions
1. **City scope:** `Listing.city` + saved-search `filters.city` (default `Lagos`). Community labels map to Lagos unless overridden.
2. **Alerts:** BullMQ repeatable every 15m with setInterval fallback when Redis/inline (same pattern as media).
3. **RecProvider:** interface + WeightedRecProviderV2; RecommendationService delegates to provider.
4. **Valuation:** ValuationProvider interface; SoldDataValuationProvider + RuleBasedFallback; cold start when sold comps &lt; N (default 5).
5. **A/B:** stable user-hash bucketing; `experiments` table; docs/EXPERIMENTS.md.
6. **Seller metrics:** computed from ListingEvent / Offer / Order — never expose buyer PII.

## Deliverables
Schema · alerts · recs v2 · valuation v2 · seller analytics · web surfaces · METRICS/EXPERIMENTS · tests · tag
