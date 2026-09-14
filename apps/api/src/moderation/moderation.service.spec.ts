import { ModerationService } from './moderation.service';
import { MockImageModerationProvider } from './mock-image-moderation.provider';

const SAMPLE_KEYWORDS = [
  { pattern: 'ak-47', category: 'weapons' },
  { pattern: 'glock', category: 'weapons' },
  { pattern: 'ammunition', category: 'weapons' },
  { pattern: 'cocaine', category: 'drugs' },
  { pattern: 'heroin', category: 'drugs' },
  { pattern: 'weed for sale', category: 'drugs' },
  { pattern: 'stolen iphone', category: 'stolen' },
  { pattern: 'hot laptop', category: 'stolen' },
  { pattern: 'ivory', category: 'wildlife' },
  { pattern: 'pangolin', category: 'wildlife' },
  { pattern: 'replica louis', category: 'counterfeit' },
  { pattern: 'fake rolex', category: 'counterfeit' },
  { pattern: 'nsfw', category: 'adult' },
  { pattern: 'xxx video', category: 'adult' },
  { pattern: 'cigarette carton', category: 'tobacco' },
  { pattern: 'tobacco wholesale', category: 'tobacco' },
  { pattern: 'whiskey crate', category: 'alcohol' },
  { pattern: 'beer pallet', category: 'alcohol' },
  { pattern: 'bitcoin wallet sell', category: 'financial_instruments' },
  { pattern: 'gift card dump', category: 'financial_instruments' },
  { pattern: 'organ for sale', category: 'body_parts' },
  { pattern: 'blood plasma sell', category: 'body_parts' },
];

describe('ModerationService keyword scan', () => {
  const service = new ModerationService(
    {} as never,
    {} as never,
    new MockImageModerationProvider(),
  );

  it.each(SAMPLE_KEYWORDS)(
    'matches $category pattern "$pattern"',
    ({ pattern, category }) => {
      const hits = service.matchKeywords(`Selling ${pattern} today`, [
        { pattern, category },
      ]);
      expect(hits).toHaveLength(1);
      expect(hits[0].category).toBe(category);
    },
  );

  it('does not match clean furniture copy', () => {
    const hits = service.matchKeywords(
      'Gently used sofa in Lekki Phase 1',
      SAMPLE_KEYWORDS,
    );
    expect(hits).toHaveLength(0);
  });

  it('is case-insensitive', () => {
    const hits = service.matchKeywords('AK-47 rifle', SAMPLE_KEYWORDS);
    expect(hits.some((h) => h.pattern === 'ak-47')).toBe(true);
  });

  it('matches multiple prohibited terms', () => {
    const hits = service.matchKeywords(
      'stolen iphone and fake rolex',
      SAMPLE_KEYWORDS,
    );
    expect(hits.length).toBeGreaterThanOrEqual(2);
  });
});

describe('MockImageModerationProvider', () => {
  const provider = new MockImageModerationProvider();

  it.each([
    'uploads/user/nsfw-photo.jpg',
    'media/NSFW_thumb.webp',
    'listings/abc/nsfw_variant.png',
    'path/with-nsfw-in-middle.jpg',
    'nsfw',
  ])('flags NSFW key %s', async (key) => {
    const result = await provider.scan({
      listingId: 'l1',
      imageKeys: [key],
    });
    expect(result.nsfw).toBe(true);
    expect(result.reasons).toContain('IMAGE_NSFW_KEY');
  });

  it('passes clean image keys', async () => {
    const result = await provider.scan({
      listingId: 'l1',
      imageKeys: ['uploads/sofa-front.jpg', 'uploads/sofa-side.jpg'],
    });
    expect(result.nsfw).toBe(false);
  });

  it('flags NSFW meta flag', async () => {
    const result = await provider.scan({
      listingId: 'l1',
      imageKeys: ['clean.jpg'],
      metaFlags: ['nsfw'],
    });
    expect(result.nsfw).toBe(true);
    expect(result.reasons).toContain('IMAGE_NSFW_META');
  });
});

describe('ModerationService edge cases', () => {
  const service = new ModerationService(
    {} as never,
    {} as never,
    new MockImageModerationProvider(),
  );

  it('ignores partial word that is not the seeded pattern', () => {
    const hits = service.matchKeywords('I like headphones', [
      { pattern: 'ak-47', category: 'weapons' },
    ]);
    expect(hits).toHaveLength(0);
  });

  it('matches pattern inside longer sentence', () => {
    const hits = service.matchKeywords(
      'Brand new cocaine for party weekend',
      [{ pattern: 'cocaine', category: 'drugs' }],
    );
    expect(hits).toHaveLength(1);
  });

  it('handles empty blob', () => {
    expect(service.matchKeywords('', SAMPLE_KEYWORDS)).toHaveLength(0);
  });
});
