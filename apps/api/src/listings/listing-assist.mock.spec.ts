import { RuleBasedAiMock } from '../providers/rule-based-ai.mock';

describe('ListingAssist RuleBasedAiMock', () => {
  const ai = new RuleBasedAiMock();

  it('returns Samsung TV draft for samsung television hints', async () => {
    const draft = await ai.draftListing({
      titleHint: 'samsung television',
      imageHints: ['samsung-tv.jpg'],
    });
    expect(draft.title).toMatch(/Samsung.*TV/i);
    expect(draft.suggestedCondition).toBe('VERY_GOOD');
    expect(draft.suggestedPriceLowNaira).toBe(280_000);
    expect(draft.suggestedPriceHighNaira).toBe(340_000);
    expect(draft.brand).toBe('Samsung');
  });

  it('is deterministic for the same samsung input', async () => {
    const a = await ai.draftListing({ imageHints: ['photo-samsung-tv'] });
    const b = await ai.draftListing({ imageHints: ['photo-samsung-tv'] });
    expect(a).toEqual(b);
  });
});
