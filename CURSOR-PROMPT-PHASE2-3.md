# CURSOR-PROMPT-PHASE2-3.md — Post-Launch Series (v1.0 → v2.1)

> Execute **only after** the MVP entry gate below is green. Product truth remains [`PRD.md`](PRD.md) §§51–53. Engineering sequencing follows this file. MVP build order remains [`CURSOR-PROMPT.md`](CURSOR-PROMPT.md).

## Entry gate checklist (MVP must be stable)

Do **not** start Prompt 2.1 until all boxes are checked:

- [ ] Tag `v0.9.0-rc` merged and deployed to staging
- [ ] PRD §58 UAT paths pass on staging (buyer, seller, admin)
- [ ] Protected payments + webhooks stable for ≥1 week in staging/mock-prod with zero money-integrity incidents
- [ ] Fraud/dispute runbooks exercised at least once (`docs/RUNBOOK.md`)
- [ ] `docs/SECURITY.md` + `docs/PRIVACY.md` reviewed; open critical findings = 0
- [ ] Seed / founding-seller supply density acceptable for Lagos focus communities (PRD §55)
- [ ] Product Owner signs: “MVP is stable — open Phase 2”

If any item fails, fix under `v0.9.x` patches — do not start post-launch features.

---

## Prompt 2.1 — Swap Marketplace + Give-Away Claims (`v1.0`)

**PRD refs:** §12 Selling Methods · §51 Phase Two (swap marketplace)

### Goal

First-class **Swap**, **Swap + Cash**, and **Give Away** purchase flows (data models already stubbed in MVP).

### Signature flow — Swap + Cash

Example: **iPhone 15 + ₦200,000 ↔ iPhone 16 Pro**

1. Buyer proposes: their listed (or newly listed) item + optional cash top-up.
2. Seller reviews item preview, cash amount, and condition claims.
3. Accept → dual-reservation / linked orders; cash leg uses existing escrow (ADR-002).
4. Fulfilment coordinates both item handovers (pickup / meet / delivery).
5. Both parties confirm → cash released; both listings → Sold / Swapped.

### Give Away

- Seller publishes `mode=GIVE_AWAY` (price 0).
- Interested users **claim** (queue or first-qualified).
- Seller accepts a claim → reserved meetup / pickup.
- No payment; still require confirmation + optional review to reduce no-shows.
- Abuse controls: claim rate limits, identity gates for high-demand items.

### Acceptance (summary)

- Demo Swap + Cash iPhone scenario end-to-end with mock PSP for cash leg.
- Give-away claim → accept → complete without charging buyer.
- Chat/offers reuse; PII rules unchanged.
- Tag `v1.0`.

---

## Prompt 2.2 — Moving Sales + Estate Communities (`v1.1`)

**PRD refs:** §21 Community Marketplaces · §22 Moving Sale · §51

### Moving Sales

- Seller creates a **Moving Sale** collection (“Relocating from Lekki — everything must go by date”).
- Multiple listings grouped; combined asking price; home/discovery rail + PDP collection surface.
- Persona C (relocating professional) can list a household set in one flow.

### Estate Communities

- Private / semi-private marketplaces (e.g. **VGC**, **Banana Island**, Lekki Phase 1, Eko Atlantic, corporate/church/alumni).
- Estate admin verifies membership; members browse community inventory with estate trust signals.
- Recreates WhatsApp estate-group trust inside ReWorth.

### Acceptance (summary)

- Create Moving Sale with ≥3 items; appears on home rail.
- Join verified estate community; listing visibility respects membership.
- Tag `v1.1`.

---

## Prompt 2.3 — Intelligence (`v1.2`)

**PRD refs:** §11 Price Intelligence · §28 Favourites (alerts) · §51

### Deliverables

1. **Saved-search alerts** — push/in-app when new matches appear (e.g. “Samsung TV, Lekki, below ₦500k”).
2. **Recommendations v2** — personalization beyond MVP stub; include lightweight **A/B framework** for ranking experiments.
3. **Price intelligence (sold-data)** — estimated market range, recommended / quick-sale / max-value using comps + solds (improves with GMV).
4. **Seller analytics** — views, saves, offer rate, time-to-sale, suggested price/photo improvements.

### Acceptance (summary)

- Alert fires on new matching listing (mock push OK).
- Seller sees analytics for own listings; price range shown on create/edit when comps exist.
- Tag `v1.2`.

---

## Prompt 2.4 — Verticals & Commercial (`v1.3`)

**PRD refs:** §27 Vehicles · §34–35 Business model · §51

### Deliverables

- **Vehicle inspection** partner flow (book inspection → report attached to listing).
- **Luxury authentication** service adapter (bag/watch/etc.) with badge on PDP.
- **Professional seller accounts** — business profile, bulk tools, optional subscription hooks (monetisation light-touch).
- **Referral programme** — invite codes, attribution, reward ledger (non-cash or credit per policy).

### Acceptance (summary)

- Vehicle listing can show “Inspected” badge after mock partner report.
- Pro seller can access bulk listing tools; referral attribution recorded.
- Tag `v1.3`.

---

## Prompt 3.1 — AI & Platform Services (`v2.0`)

**PRD refs:** §53 Future AI Experience · §52 Phase Three

### Deliverables

1. **Marketplace assistant** — budget / bundle queries (“furnishing a one-bed with ₦1.5m”) returns curated listing sets.
2. **Room scan (PRD §53)** — user photographs living room → detect saleable items (TV, soundbar, table, chairs, lamp…) → “Sell these six?” → draft listings created.
3. **Instant buy** — streamlined path for fixed-price eligible listings.
4. **Consignment** + **managed pickup** — seller hands inventory to ReWorth/partner ops; listing continues under consignment rules.

### Acceptance (summary)

- Room-scan demo with mock vision returns ≥3 draft listings from fixture images.
- Assistant returns a budget bundle from live index.
- Tag `v2.0`.

---

## Prompt 3.2 — B2B & Expansion (`v2.1`)

**PRD refs:** §52 · §54–56 · Persona C

### Deliverables

- **Corporate relocation** — bulk dispose of household/office assets (e.g. 12-item move) with coordinator roles.
- **Estate partnership API** — external estate systems can sync membership / promote community marketplace.
- **Circular-economy hand-offs** — route unsold/give-away items to partner recyclers / NGOs with consent.
- **Config-driven national expansion** — cities/communities as config (not hard-coded Lagos-only), feature flags per market.

### Acceptance (summary)

- Corporate relocation workspace manages multi-item sale to completion.
- New city enabled via config without code change to core listing/search.
- Tag `v2.1`.

---

## Post-launch tag map

| Prompt | Tag | Focus |
| --- | --- | --- |
| 2.1 | `v1.0` | Swap marketplace + Give-Away claims |
| 2.2 | `v1.1` | Moving Sales + Estate Communities |
| 2.3 | `v1.2` | Alerts, recommendations v2, price intel, seller analytics |
| 2.4 | `v1.3` | Vehicle inspection, luxury auth, pro sellers, referrals |
| 3.1 | `v2.0` | AI assistant, room scan §53, instant buy, consignment |
| 3.2 | `v2.1` | Corporate relocation, estate API, circular partnerships, national expansion |

## Resume note

Same cheat sheet as MVP — resume from `docs/PHASE_STATUS.md`, re-read `AGENTS.md` + `PRD.md`, do not restart completed work. Always re-verify the **entry gate** before any 2.x/3.x prompt.
