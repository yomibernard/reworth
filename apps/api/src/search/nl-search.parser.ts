import type { SearchFilters } from '../providers/search.provider';

export type NlInterpreted = {
  chips: string[];
  filters: SearchFilters & {
    categorySlug?: string;
    subcategorySlug?: string;
  };
};

type CommunityHit = {
  code: string;
  label: string;
  lat: number;
  lng: number;
};

/**
 * Rule-based NL search parser (mock) — deterministic fixtures for Phase 3.
 * Query prices are naira; stored filters use kobo (naira × 100).
 */
export class NlSearchParser {
  parse(
    query: string,
    opts?: { lat?: number; lng?: number },
  ): NlInterpreted {
    const raw = query.trim();
    const lower = raw.toLowerCase();
    const chips: string[] = [];
    const filters: NlInterpreted['filters'] = {};

    if (opts?.lat != null) filters.lat = opts.lat;
    if (opts?.lng != null) filters.lng = opts.lng;

    const community = this.detectCommunity(lower);
    if (community) {
      filters.community = community.code;
      chips.push(community.label);
      if (filters.lat == null && filters.lng == null) {
        filters.lat = community.lat;
        filters.lng = community.lng;
      }
      filters.radiusKm = filters.radiusKm ?? 10;
    }

    const priceMax = this.parsePriceMax(lower);
    if (priceMax != null) {
      filters.priceMaxKobo = priceMax;
      chips.push(
        `Under ₦${Math.round(priceMax / 100).toLocaleString('en-NG')}`,
      );
    }
    const priceMin = this.parsePriceMin(lower);
    if (priceMin != null) {
      filters.priceMinKobo = priceMin;
      chips.push(
        `From ₦${Math.round(priceMin / 100).toLocaleString('en-NG')}`,
      );
    }

    if (/\blike\s*new\b/.test(lower)) {
      filters.condition = 'LIKE_NEW';
      chips.push('Like new');
    } else if (/\bbrand\s*new\b/.test(lower)) {
      filters.condition = 'NEW';
      chips.push('New');
    } else if (/\bvery\s*good\b/.test(lower)) {
      filters.condition = 'VERY_GOOD';
      chips.push('Very good');
    }

    if (/\bverified\b/.test(lower)) {
      filters.verifiedOnly = true;
      chips.push('Verified sellers');
    }
    if (/\bdelivery\b/.test(lower)) {
      filters.deliveryAvailable = true;
      chips.push('Delivery');
    }

    const cat = this.detectCategory(lower);
    if (cat) {
      filters.categorySlug = cat.categorySlug;
      if (cat.subcategorySlug) filters.subcategorySlug = cat.subcategorySlug;
      chips.push(cat.label);
    }

    const q = this.extractKeyword(raw, lower);
    if (q) {
      filters.q = q;
      if (!chips.includes(q)) chips.push(q);
    }

    filters.sort =
      filters.lat != null && filters.lng != null ? 'distance' : 'newest';

    return { chips, filters };
  }

  private detectCommunity(lower: string): CommunityHit | null {
    const map: Array<{ re: RegExp } & CommunityHit> = [
      {
        re: /\blekki\b/,
        code: 'LEKKI_PH1',
        label: 'Lekki',
        lat: 6.4474,
        lng: 3.4721,
      },
      {
        re: /\bikoyi\b/,
        code: 'IKOYI',
        label: 'Ikoyi',
        lat: 6.4541,
        lng: 3.4358,
      },
      {
        re: /\bvictoria\s*island\b|\bvi\b/,
        code: 'VI',
        label: 'VI',
        lat: 6.4281,
        lng: 3.4219,
      },
      {
        re: /\bvgc\b/,
        code: 'VGC',
        label: 'VGC',
        lat: 6.4698,
        lng: 3.565,
      },
      {
        re: /\bchevron\b/,
        code: 'CHEVRON',
        label: 'Chevron',
        lat: 6.441,
        lng: 3.52,
      },
      {
        re: /\bajah\b/,
        code: 'AJAH',
        label: 'Ajah',
        lat: 6.4667,
        lng: 3.5667,
      },
      {
        re: /\boniru\b/,
        code: 'ONIRU',
        label: 'Oniru',
        lat: 6.435,
        lng: 3.45,
      },
    ];
    for (const c of map) {
      if (c.re.test(lower)) {
        return {
          code: c.code,
          label: c.label,
          lat: c.lat,
          lng: c.lng,
        };
      }
    }
    return null;
  }

  private parsePriceMax(lower: string): number | null {
    const m =
      /(?:under|below|max|less\s+than)\s*₦?\s*([\d,]+)\s*(k)?\b/.exec(
        lower,
      );
    if (!m) return null;
    return this.toKobo(m[1], m[2] === 'k');
  }

  private parsePriceMin(lower: string): number | null {
    const m = /(?:over|above|from|min)\s*₦?\s*([\d,]+)\s*(k)?\b/.exec(lower);
    if (!m) return null;
    return this.toKobo(m[1], m[2] === 'k');
  }

  private toKobo(raw: string, isK: boolean): number {
    const naira = Number(raw.replace(/,/g, ''));
    if (!Number.isFinite(naira)) return 0;
    const value = isK ? naira * 1000 : naira;
    return Math.round(value * 100);
  }

  private detectCategory(
    lower: string,
  ): { categorySlug: string; subcategorySlug?: string; label: string } | null {
    if (/\bsofas?\b|\bcouch(es)?\b/.test(lower)) {
      return {
        categorySlug: 'home-furniture',
        subcategorySlug: 'sofas',
        label: 'Sofas',
      };
    }
    if (/\bbeds?\b/.test(lower)) {
      return {
        categorySlug: 'home-furniture',
        subcategorySlug: 'beds',
        label: 'Beds',
      };
    }
    if (/\biphones?\b|\bsmartphones?\b/.test(lower)) {
      return {
        categorySlug: 'phones-tablets',
        subcategorySlug: 'smartphones',
        label: 'Phones',
      };
    }
    if (/\bphones?\b/.test(lower) && !/\bheadphones?\b/.test(lower)) {
      return {
        categorySlug: 'phones-tablets',
        subcategorySlug: 'smartphones',
        label: 'Phones',
      };
    }
    if (/\btvs?\b|\btelevisions?\b/.test(lower)) {
      return {
        categorySlug: 'electronics',
        subcategorySlug: 'tvs',
        label: 'TVs',
      };
    }
    if (/\blaptops?\b/.test(lower)) {
      return {
        categorySlug: 'computers',
        subcategorySlug: 'laptops',
        label: 'Laptops',
      };
    }
    if (/\bfurniture\b/.test(lower)) {
      return { categorySlug: 'home-furniture', label: 'Furniture' };
    }
    if (/\belectronics\b/.test(lower)) {
      return { categorySlug: 'electronics', label: 'Electronics' };
    }
    if (/\bcars?\b/.test(lower)) {
      return {
        categorySlug: 'vehicles',
        subcategorySlug: 'cars',
        label: 'Cars',
      };
    }
    return null;
  }

  /**
   * Keep brand / free-text tokens; drop structural phrases already mapped to filters.
   * Simple queries like "LG TV" keep the full phrase as `q`.
   */
  private extractKeyword(raw: string, lower: string): string | undefined {
    // Bare brand+product phrases: keep entire query as keyword
    if (/^(lg|samsung|sony|apple|hp|dell)\s+(tv|television|phone|laptop)s?$/i.test(raw.trim())) {
      return raw.trim().replace(/televisions?/i, 'TV');
    }
    if (/^[a-z0-9][\w.\-]*(?:\s+[a-z0-9][\w.\-]*){0,3}$/i.test(raw.trim())) {
      // Short free-text without filter verbs → whole string is q (e.g. "LG TV", "MacBook Pro")
      // unless only a category noun
      const onlyCat =
        /^(sofas?|couches?|beds?|furniture|electronics|tvs?|televisions?|iphones?|phones?|laptops?|cars?)$/i.test(
          raw.trim(),
        );
      if (!onlyCat && !this.hasFilterLanguage(lower)) {
        return raw.trim();
      }
    }

    let q = raw;
    const strip: RegExp[] = [
      /\bshow\s+me\b/gi,
      /\bfind\b/gi,
      /\blooking\s+for\b/gi,
      /\baround\b/gi,
      /\bin\b/gi,
      /\bnear\b/gi,
      /\bwith\s+delivery\b/gi,
      /\bverified\s+sellers?\b/gi,
      /\bverified\b/gi,
      /\bdelivery\b/gi,
      /(?:under|below|max|less\s+than|over|above|from|min)\s*₦?\s*[\d,]+\s*k?\b/gi,
      /\bbrand\s*new\b/gi,
      /\blike\s*new\b/gi,
      /\bvery\s*good\b/gi,
      /\bsofas?\b/gi,
      /\bcouch(es)?\b/gi,
      /\bbeds?\b/gi,
      /\bfurniture\b/gi,
      /\belectronics\b/gi,
      /\btelevisions?\b/gi,
      /\btvs?\b/gi,
      /\biphones?\b/gi,
      /\bsmartphones?\b/gi,
      /\bphones?\b/gi,
      /\blaptops?\b/gi,
      /\bcars?\b/gi,
      /\blekki\b/gi,
      /\bikoyi\b/gi,
      /\bvgc\b/gi,
      /\bchevron\b/gi,
      /\bajah\b/gi,
      /\boniru\b/gi,
      /\bvictoria\s*island\b/gi,
      /\bvi\b/gi,
      /[₦,]/g,
    ];
    for (const re of strip) q = q.replace(re, ' ');
    q = q.replace(/\s+/g, ' ').trim();
    return q || undefined;
  }

  private hasFilterLanguage(lower: string): boolean {
    return /under|below|around|in\s+\w+|verified|delivery|show\s+me|find\b|looking/.test(
      lower,
    );
  }
}
