export type AiListingDraftInput = {
  titleHint?: string;
  descriptionHint?: string;
  categoryHint?: string;
  communityHint?: string;
};

export type AiListingDraft = {
  title: string;
  description: string;
  suggestedCategory: string;
  suggestedPriceNaira: number;
  tags: string[];
};

export interface AiListingProvider {
  readonly name: string;
  draftListing(input: AiListingDraftInput): Promise<AiListingDraft>;
}

export const AI_LISTING_PROVIDER = Symbol('AI_LISTING_PROVIDER');
