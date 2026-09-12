import { toPublicListing } from './public-listing.mapper';

describe('toPublicListing privacy', () => {
  const base = {
    id: '11111111-1111-1111-1111-111111111111',
    title: 'Sofa',
    description: 'Nice sofa',
    brand: 'Ikea',
    model: 'Kivik',
    condition: 'GOOD',
    priceKobo: 150_000_00,
    negotiable: true,
    sellingMode: 'SELL',
    status: 'LIVE',
    community: 'LEKKI_PH1',
    geoLat: 6.44,
    geoLng: 3.47,
    fulfilmentPickup: true,
    fulfilmentMeet: true,
    fulfilmentDelivery: false,
    createdAt: new Date('2026-01-01'),
    publishedAt: new Date('2026-01-02'),
    vehicle: { make: 'Toyota', vin: 'SECRETVIN123' },
    addressPrivate: '12 Hidden Street, Lekki',
    category: {
      id: '22222222-2222-2222-2222-222222222222',
      slug: 'home-furniture',
      name: 'Home & Furniture',
    },
    images: [],
    seller: {
      id: '33333333-3333-3333-3333-333333333333',
      phone: '+2348012345678',
      email: 'seller@example.com',
      profile: { displayName: 'Ada' },
      verifications: [{ level: 'L3_IDENTITY', status: 'VERIFIED' }],
    },
  };

  it('never exposes addressPrivate or address keys', () => {
    const dto = toPublicListing(base);
    const keys = Object.keys(dto);
    expect(keys).not.toContain('addressPrivate');
    expect(keys).not.toContain('address');
    expect(keys).not.toContain('line1');
    expect((dto as Record<string, unknown>).addressPrivate).toBeUndefined();
  });

  it('strips VIN from vehicle and seller PII', () => {
    const dto = toPublicListing(base);
    expect(dto.vehicle).toEqual({ make: 'Toyota' });
    expect(dto.vehicle).not.toHaveProperty('vin');
    expect(dto.seller).not.toHaveProperty('phone');
    expect(dto.seller).not.toHaveProperty('email');
    expect(dto.seller.displayName).toBe('Ada');
    expect(dto.seller.verificationBadge).toBe(true);
    expect(dto.seller.ratingLabel).toBe('New');
    expect(dto.buyerProtection).toBe(true);
  });
});
