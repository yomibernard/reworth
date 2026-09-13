# Metrics — seller analytics & admin KPIs

Phase 2.3 (`v1.2-intelligence`). All seller metrics are **city-scoped** and **never expose buyer identity** (no buyer id, email, phone, or chat PII).

## Seller dashboard charts

### Views

Unique or raw listing view events for the seller’s listings in the city window.

```sql
-- Sketch: ListingEvent / analytics_events style
SELECT le."listingId", COUNT(*) AS views
FROM listing_events le
JOIN listings l ON l.id = le."listingId"
WHERE l."sellerId" = $sellerId
  AND l.city = $city
  AND le.type = 'VIEW'
  AND le."createdAt" >= $since
GROUP BY le."listingId";
```

### Saves (favourites)

```sql
SELECT f."listingId", COUNT(*) AS saves
FROM favourites f
JOIN listings l ON l.id = f."listingId"
WHERE l."sellerId" = $sellerId AND l.city = $city
GROUP BY f."listingId";
```

### Offers

```sql
SELECT o."listingId", COUNT(*) AS offers
FROM offers o
JOIN listings l ON l.id = o."listingId"
WHERE l."sellerId" = $sellerId AND l.city = $city
GROUP BY o."listingId";
```

### Offer → sale conversion

`completed_orders_with_prior_offer / offers` (per listing and aggregate).

```sql
-- Per listing sketch
WITH offer_counts AS (
  SELECT "listingId", COUNT(*) AS offers FROM offers GROUP BY 1
),
sold AS (
  SELECT o."listingId", COUNT(DISTINCT ord.id) AS sales
  FROM orders ord
  JOIN listings l ON l.id = ord."listingId"
  LEFT JOIN offers o ON o."listingId" = l.id AND o."buyerId" = ord."buyerId"
  WHERE ord.status = 'COMPLETED' AND l."sellerId" = $sellerId AND l.city = $city
  GROUP BY 1
)
SELECT s."listingId",
       COALESCE(s.sales, 0)::float / NULLIF(oc.offers, 0) AS offer_to_sale
FROM offer_counts oc
LEFT JOIN sold s USING ("listingId");
```

### Median time-to-sale (TTS)

Hours from `publishedAt` (or first LIVE) to order `COMPLETED` / listing sold timestamp.

```sql
SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (
  ORDER BY EXTRACT(EPOCH FROM (ord."updatedAt" - l."publishedAt")) / 3600.0
) AS median_tts_hours
FROM orders ord
JOIN listings l ON l.id = ord."listingId"
WHERE ord.status = 'COMPLETED'
  AND l."sellerId" = $sellerId
  AND l.city = $city
  AND l."publishedAt" IS NOT NULL;
```

### Revenue 30d / 90d

Sum of `orders.amountKobo` (or `totalKobo` item leg) for `COMPLETED` orders where seller owns the listing, filtered by city and `completedAt` / status transition time.

```sql
SELECT
  COALESCE(SUM(CASE WHEN ord."updatedAt" >= NOW() - INTERVAL '30 days'
    THEN ord."amountKobo" ELSE 0 END), 0) AS revenue_30d_kobo,
  COALESCE(SUM(CASE WHEN ord."updatedAt" >= NOW() - INTERVAL '90 days'
    THEN ord."amountKobo" ELSE 0 END), 0) AS revenue_90d_kobo
FROM orders ord
JOIN listings l ON l.id = ord."listingId"
WHERE ord.status = 'COMPLETED'
  AND l."sellerId" = $sellerId
  AND l.city = $city;
```

### Price competitiveness

`askingKobo / marketMidKobo` where market mid comes from price intelligence (sold comps mid or recommended). Values &gt; 1 = priced above market.

### Best / worst performers

Rank listings by a composite (e.g. views × conversion, or revenue). Best = top N; worst = live listings with high views / low offers or long TTS.

### Response time

Seller trust aggregate `responseMinutes` (existing trust module) — shown once at aggregate level.

## Privacy

- Responses must not include `buyerId`, buyer profile, phone, or email.
- CSV export mirrors the same fields as the JSON dashboard.

## Admin KPI notes (city + aggregate)

Admin analytics should slice:

| KPI | Definition | City filter |
| --- | --- | --- |
| GMV | Sum completed `amountKobo` | `listings.city` |
| Take rate | Protection fees / GMV | same |
| Sell-through | Sold listings / published | same |
| Median TTS | As above, platform-wide | same |
| Valuation coverage | % listings with `sampleCount >= VALUATION_MIN_SAMPLES` | `ValuationModelReport.city` |
| Rec CTR | Experiment metrics for `rec_home_v2` | join user city / listing city |

Never mix cities in a single KPI cell without an explicit “All cities” rollup row.
