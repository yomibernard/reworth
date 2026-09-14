import { BundleService } from './bundle.service';
import { pickBudgetBundle } from './mock-assistant.provider';

describe('Bundles (Phase 3.1)', () => {
  const catalog = [
    {
      id: '1',
      title: 'Sofa',
      priceKobo: 200_000_00,
      city: 'Lagos',
      categoryId: 'furniture',
      geoLat: 6.45,
      geoLng: 3.45,
    },
    {
      id: '2',
      title: 'TV',
      priceKobo: 150_000_00,
      city: 'Lagos',
      categoryId: 'electronics',
      geoLat: 6.46,
      geoLng: 3.46,
    },
    {
      id: '3',
      title: 'Lamp',
      priceKobo: 20_000_00,
      city: 'Lagos',
      categoryId: 'home',
    },
    {
      id: '4',
      title: 'Table',
      priceKobo: 80_000_00,
      city: 'Lagos',
      categoryId: 'furniture',
    },
    {
      id: '5',
      title: 'Chair set',
      priceKobo: 60_000_00,
      city: 'Lagos',
      categoryId: 'furniture',
    },
    {
      id: '6',
      title: 'Fridge',
      priceKobo: 250_000_00,
      city: 'Abuja',
      categoryId: 'appliances',
    },
    {
      id: '7',
      title: 'Rug',
      priceKobo: 40_000_00,
      city: 'Lagos',
      categoryId: 'home',
    },
    {
      id: '8',
      title: 'Microwave',
      priceKobo: 35_000_00,
      city: 'Lagos',
      categoryId: 'appliances',
    },
  ];

  it('property: total never exceeds budget', () => {
    const budgets = [100_000_00, 300_000_00, 500_000_00, 1_500_000_00];
    for (const budget of budgets) {
      const picked = pickBudgetBundle(
        catalog.filter((c) => c.city === 'Lagos'),
        budget,
      );
      const total = picked.reduce((s, p) => s + p.priceKobo, 0);
      expect(total).toBeLessThanOrEqual(budget);
      expect(picked.length).toBeLessThanOrEqual(8);
    }
  });

  it('city scope: only Lagos listings when city=Lagos', () => {
    const svc = Object.create(BundleService.prototype) as BundleService;
    const { picked, totalKobo, city } = svc.buildWithinBudget(
      catalog,
      1_000_000_00,
      'Lagos',
    );
    expect(city).toBe('Lagos');
    expect(picked.every((p) => p.city === 'Lagos')).toBe(true);
    expect(picked.some((p) => p.id === '6')).toBe(false);
    expect(totalKobo).toBeLessThanOrEqual(1_000_000_00);
  });

  it('mixes categories when possible', () => {
    const picked = pickBudgetBundle(
      catalog.filter((c) => c.city === 'Lagos'),
      800_000_00,
    );
    const cats = new Set(picked.map((p) => p.categoryId));
    expect(cats.size).toBeGreaterThanOrEqual(2);
  });
});
