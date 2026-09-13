/** Lagos communities for preferredCommunity (PATCH /me). */
export const COMMUNITIES = [
  "Lekki Ph1",
  "Ikoyi",
  "VI",
  "Oniru",
  "VGC",
  "Chevron",
  "Ajah",
  "Other Lagos",
] as const;

export type Community = (typeof COMMUNITIES)[number];
