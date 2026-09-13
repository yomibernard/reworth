# Demo walkthrough — 10 minutes (`v0.9.0-rc`)

> Staging or local after `pnpm seed:staging`. Passwords are **demo only** — never use in production.

## Demo accounts

| Persona | Login | Password | Role |
| --- | --- | --- | --- |
| **Ori** (seller) | `ori@demo.reworth.ng` / `+2348010000001` | `DemoOri!2026` | Verified seller, Lekki |
| **Ayo** (buyer) | `ayo@demo.reworth.ng` / `+2348010000002` | `DemoAyo!2026` | Buyer, Ikoyi |
| **Risk analyst** | `risk@demo.reworth.ng` | `DemoRisk!2026` | Admin `RISK_FRAUD` |
| **Super Admin** | `$ADMIN_SUPER_EMAIL` | `$ADMIN_SUPER_PASSWORD` | Full admin |

## Script (≈10 min)

1. **Home is alive (1 min)** — Open web `/`. Show rails with 2k+ seeded listings across Lagos communities. Tagline: *Lagos, your unused things are worth something.*
2. **Sell in ~60s (2 min)** — Login as Ori → Sell → photos → AI assist → price → Publish. Note LIVE vs UNDER_REVIEW if risk fires.
3. **Discover & chat (2 min)** — Login as Ayo → Search “sofa Lekki” → open PDP → Save → Message Ori → Make offer.
4. **Protected buy (2 min)** — Accept offer as Ori (or Buy Now) → Checkout mock Paystack → Hand over → Ayo confirms receipt → Review.
5. **Trust & safety (2 min)** — Admin: risk queue / UNDER_REVIEW listing. Optional: dispute → partial refund (Finance/Risk).
6. **Ops close (1 min)** — Dashboard KPIs (GMV, open disputes, fraud rate). Audit log shows admin actions.

## Talking points

- Escrow-shaped payments (ADR-002), not classifieds cash-only.
- Community-first discovery (Lekki → Ajah).
- Risk + moderation from Phase 9 on every publish.
