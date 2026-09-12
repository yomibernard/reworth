import type {
  AiListingDraft,
  AiListingDraftInput,
  AiListingProvider,
} from './ai-listing.provider';

/** Rule-based mock — no external AI calls. */
export class RuleBasedAiMock implements AiListingProvider {
  readonly name = 'rule-based-ai';

  async draftListing(input: AiListingDraftInput): Promise<AiListingDraft> {
    const title =
      input.titleHint?.trim() ||
      'Gently used item in great condition';
    const description =
      input.descriptionHint?.trim() ||
      `${title}. Clean, functional, and ready for a new home in Lagos. Pickup preferred.`;
    const suggestedCategory = input.categoryHint?.trim() || 'General';
    const tags = [
      suggestedCategory.toLowerCase(),
      input.communityHint?.toLowerCase() || 'lagos',
      'preloved',
    ].filter(Boolean);

    const wordCount = description.split(/\s+/).length;
    const suggestedPriceNaira = Math.min(
      500_000,
      Math.max(2_000, wordCount * 750),
    );

    return {
      title,
      description,
      suggestedCategory,
      suggestedPriceNaira,
      tags,
    };
  }
}
