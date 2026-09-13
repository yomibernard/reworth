# Phase 3 plan — Discovery: Home, Search & Favourites

**Branch:** `phase-3-discovery` · **Tag:** `v0.3-discovery`  
**Depends on:** Phase 2 (`v0.2-listings`)

## Schema
- FavouriteListing, FollowedSeller, SavedSearch (+ newMatchesCount)
- Optional listing textSearch tsvector via generated column or query-time `to_tsvector`

## Search
- SearchProvider: PostgresFtsAdapter (default) + OpenSearchAdapter stub
- GET /search with filters, facets, cursor pagination, geo distance
- POST /search/nl mock parser (regex/keyword) → filters + results

## Home
- GET /home/rails?community&radiusKm&lat&lng
- Rails: nearby, justListed, priceDrops, popularNearYou, verifiedSellers, movingSales (empty), recommended
- Redis cache 45s TTL (fallback in-memory if Redis down)

## Favourites
- POST/DELETE favourites, follows, saved searches
- GET /me/favourites with tabs payload

## UI
- Web home upgrade, /search, /my favourites tabs
- Mobile home rails + search + My tab

## Risks
- OpenSearch optional; Postgres FTS is the Phase 3 path
- Lighthouse budgets documented; CI may skip full LH if no Chrome in runner
