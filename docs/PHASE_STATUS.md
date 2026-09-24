# Phase status

| Field | Value |
| --- | --- |
| Current | **Design elevation complete** `v1.0.3-design-elevation` |
| Last completed phase | **3.3 — Monetization** `v2.2-monetization` |
| Status | **Near complete** (completion PR on `phase-design-elevation-complete`) |
| Last updated | 2026-09-20 |

## Design elevation summary (`v1.0.3-design-elevation`)

### Foundation (PR #22 — shipped)
- Phone **or** email registration; profile customise
- `docs/DESIGN.md` + token sync; contrast audit in CI

### Brand palette refresh (navy / orange / beige)
- Tokens: Soft White `#FCFAF6`, Beige `#F2E7D5`, Navy `#172A3A`, Orange `#D96A32`, Slate `#59636D`
- Primary CTA = Burnt Orange; Secondary = Midnight Navy; Chip selected = Beige
- Chat: beige / soft-orange bubbles; contrast audit updated

### Listing AI assist (ADR-010)
- `AI_PROVIDER=openai` + `OPENAI_API_KEY` → GPT-4o vision/text draft on Sell **Analyze**
- Default remains `mock` (rule-based); OpenAI failures fall back to mock

### Adoption P0s (shipped in code)
- JWT access default **24h** + boot/interval refresh; Home no longer clears session on network blips
- Mock SMS OTP ceilings raised for local QA; clearer 429 copy on mobile
- Sell photos: `media/complete` accepts `inlineBase64` + seeds placeholder bytes for vision
- Prisma seed ships **21 LIVE Lagos listings** with cover images (`DEMO_SEED`)
- Home falls back to Lagos-wide when preferred community has no inventory

### Adoption P1 (shipped in code)
- Expo push: foreground handler + tap listeners route chat / order / listing / moving-sale / community
- Mobile **Communities** modal (browse / mine / join / invite redeem)
- Mobile **Moving Sales** modal (browse / follow / create) + Home rail cards
- Profile shortcuts + Home banners wired

### Adoption P2 (shipped in code)
- Checkout: escrow / meetup / delivery copy + trust badges + photo thumb
- Sell: **Take photo** (camera) + gallery + removable filmstrip scan-line
- Profile **Stats** tab — seller analytics (views / saves / offers / revenue)

### Adoption P3 (shipped in code)
- Ask ReWorth: suggestion chips, mutation **Confirm**, search/bundle/valuation cards
- Room scan: multi-photo upload, detect phases, item include/skip, create drafts
- Search filters: price min/max + sort; Offer sheet: asking price + % chips; BottomSheet scrolls

### Adoption P4 (shipped in code)
- Mobile **Referrals** modal (code, share, invite status) from Profile
- Mobile **Pro seller** modal (apply / subscribe / bulk CSV)
- Web companion: PDP Boost + Featured purchase; `/sell` Seller Plus upgrade/cancel

### Adoption P5 (shipped in code)
- OAuth Google / Apple on mobile + web onboarding method step
- Client libs call `POST /auth/oauth/:provider/callback` (API mock adapter when secrets unset)

### Adoption P6 (shipped in code)
- Mobile saved-search alerts: Search → **Save alert**; Profile → Saved → **Alerts** (pause / digest / delete / open)
- Reuses `/me/saved-searches` + favourites payload; opens Discover with seeded filters

### Adoption P7 (shipped in code)
- Ask bundle **Save & share**; `SharedBundleModal` for `/ask/bundles/:token` deep links
- Save-to-my-bundles + re-share; push/deep-link kind `bundle`

### Adoption P8 (shipped in code)
- Pro **storefront** modal (`GET /storefronts/:handle`); deep link `/u/:handle`
- Pro seller → View / Share storefront

### Adoption P9 (shipped in code)
- Swap chat Accept/Reject; propose opens conversation
- Vehicle inspection book (request/pay/schedule); web verticals paths fixed
- Luxury `authRequired` + Instant Buy + donate-if-unsold on Sell
- Instant Buy order schedule/confirm + `GET /instant-buy/by-order/:orderId`

### Still open vs full directive
- ~~Chat bubbles~~ token pass (`ChatScreens` → `theme/tokens` + `useColors`)
- ~~Orders timeline / Notifications~~ token pass (`OrdersScreens`, `NotificationsScreens`)
- ~~PDP sheets~~ token pass (`ListingDetailModal` brand badges + sheets)
- Maestro stubs present (`e2e/mobile/*.yaml` + README); OTP/Sell **testIDs** wired; **real-device ≤60s recording** still open
- Full-app hex purge: core consumer screens + CTA `onAccent` token (light/dark safe); only `theme/tokens.ts` retains palette hex
- P10 partials closed: Worth photo/share, sell price intel, consign/pickup lifecycle, Home For you recs
- P11 B2B: Corporate relocation + Partner console on mobile (Profile)
- Pilot cities: **Lagos + Abuja** (`status=pilot`; PH/Ibadan supply-only)
- Dual-channel OTP (SMS + WhatsApp) shipped; Termii live keys still pending
- Brand-asset pass: mobile onboarding / Chat / Orders status badges; web onboarding illustrations + channel chips; Sell empty/photo CTAs; dispute status badge
- ~~Hex purge~~ → `theme/tokens` + `onAccent` / `--rw-on-accent`
- Local k6 **health-smoke** pass 2026-09-20 (p95 ~5ms @ 1 VU); **staging 500 VU gate** still required

## Resume

1. Maestro on device: `maestro test e2e/mobile/00_demo_60s.yaml` + ≤60s screen record  
2. Staging k6: overwrite `infra/k6/results-phase9-summary.json` (`docs/PERF.md`)  
3. Termii live keys in staging `.env` when available
