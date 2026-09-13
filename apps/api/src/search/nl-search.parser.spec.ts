import { NlSearchParser } from './nl-search.parser';

describe('NlSearchParser', () => {
  const parser = new NlSearchParser();

  it('1. sofas under ₦500,000 around Lekki', () => {
    const r = parser.parse('Show me sofas under ₦500,000 around Lekki');
    expect(r.filters.subcategorySlug).toBe('sofas');
    expect(r.filters.categorySlug).toBe('home-furniture');
    expect(r.filters.priceMaxKobo).toBe(50_000_000); // ₦500,000 → kobo
    expect(r.filters.community).toBe('LEKKI_PH1');
    expect(r.chips).toEqual(
      expect.arrayContaining(['Sofas', 'Lekki', expect.stringContaining('500')]),
    );
  });

  it('2. LG TV → keyword q', () => {
    const r = parser.parse('LG TV');
    expect(r.filters.q).toMatch(/LG/i);
    expect(r.filters.subcategorySlug).toBe('tvs');
  });

  it('3. iPhones in VGC under 400000', () => {
    const r = parser.parse('iPhones in VGC under 400000');
    expect(r.filters.subcategorySlug).toBe('smartphones');
    expect(r.filters.community).toBe('VGC');
    expect(r.filters.priceMaxKobo).toBe(40_000_000);
  });

  it('4. Samsung TV in Ikoyi', () => {
    const r = parser.parse('Samsung TV in Ikoyi');
    expect(r.filters.community).toBe('IKOYI');
    expect(r.filters.subcategorySlug).toBe('tvs');
    expect(r.filters.q?.toLowerCase()).toContain('samsung');
  });

  it('5. laptops under 250k with delivery', () => {
    const r = parser.parse('laptops under 250k with delivery');
    expect(r.filters.subcategorySlug).toBe('laptops');
    expect(r.filters.priceMaxKobo).toBe(250_000_00); // 250k naira * 100
    expect(r.filters.deliveryAvailable).toBe(true);
  });

  it('6. verified sellers beds in Chevron', () => {
    const r = parser.parse('verified sellers beds in Chevron');
    expect(r.filters.verifiedOnly).toBe(true);
    expect(r.filters.subcategorySlug).toBe('beds');
    expect(r.filters.community).toBe('CHEVRON');
  });

  it('7. like new furniture under ₦100,000', () => {
    const r = parser.parse('like new furniture under ₦100,000');
    expect(r.filters.condition).toBe('LIKE_NEW');
    expect(r.filters.categorySlug).toBe('home-furniture');
    expect(r.filters.priceMaxKobo).toBe(10_000_000);
  });

  it('8. cars around VI', () => {
    const r = parser.parse('cars around VI');
    expect(r.filters.subcategorySlug).toBe('cars');
    expect(r.filters.community).toBe('VI');
    expect(r.filters.sort).toBe('distance');
  });

  it('9. MacBook Pro', () => {
    const r = parser.parse('MacBook Pro');
    expect(r.filters.q).toBe('MacBook Pro');
  });

  it('10. sofas from 200000 under 600000 in Ajah', () => {
    const r = parser.parse('sofas from 200000 under 600000 in Ajah');
    expect(r.filters.subcategorySlug).toBe('sofas');
    expect(r.filters.priceMinKobo).toBe(20_000_000);
    expect(r.filters.priceMaxKobo).toBe(60_000_000);
    expect(r.filters.community).toBe('AJAH');
  });
});
