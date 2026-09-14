/**
 * Phase 9 seed — risk rules + moderation keywords (PRD §32–33).
 */
import { Prisma, PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const DEFAULT_RULES: Array<{
  code: string;
  name: string;
  weight: number;
  config?: Record<string, unknown>;
}> = [
  { code: 'DUPLICATE_IMAGE', name: 'Duplicate listing image (dHash)', weight: 30 },
  { code: 'LOW_PRICE', name: 'Price far below market estimate', weight: 25 },
  { code: 'RAPID_LISTING', name: 'Rapid listing creation', weight: 20 },
  { code: 'REPORTED_USER', name: 'User has open or recent reports', weight: 15 },
  { code: 'DEVICE_FINGERPRINT', name: 'Shared device fingerprint', weight: 15 },
  { code: 'REPEATED_CANCEL', name: 'Repeated order cancellations', weight: 15 },
  { code: 'SUSPICIOUS_PAYMENT', name: 'Suspicious payment pattern', weight: 20 },
  { code: 'OFF_PLATFORM_CHAT', name: 'Off-platform chat signals', weight: 15 },
  { code: 'LOCATION_JUMP', name: 'Listing location vs preferred community', weight: 10 },
  {
    code: 'THRESHOLDS',
    name: 'Risk score thresholds',
    weight: 0,
    config: { medium: 40, high: 70 },
  },
];

const KEYWORDS: Array<{ pattern: string; category: string }> = [
  // weapons
  { pattern: 'ak-47', category: 'weapons' },
  { pattern: 'glock', category: 'weapons' },
  { pattern: 'ammunition', category: 'weapons' },
  // drugs
  { pattern: 'cocaine', category: 'drugs' },
  { pattern: 'heroin', category: 'drugs' },
  { pattern: 'weed for sale', category: 'drugs' },
  // stolen
  { pattern: 'stolen iphone', category: 'stolen' },
  { pattern: 'hot laptop', category: 'stolen' },
  // wildlife
  { pattern: 'ivory', category: 'wildlife' },
  { pattern: 'pangolin', category: 'wildlife' },
  // counterfeit
  { pattern: 'replica louis', category: 'counterfeit' },
  { pattern: 'fake rolex', category: 'counterfeit' },
  // adult
  { pattern: 'nsfw', category: 'adult' },
  { pattern: 'xxx video', category: 'adult' },
  // tobacco
  { pattern: 'cigarette carton', category: 'tobacco' },
  { pattern: 'tobacco wholesale', category: 'tobacco' },
  // alcohol
  { pattern: 'whiskey crate', category: 'alcohol' },
  { pattern: 'beer pallet', category: 'alcohol' },
  // financial instruments
  { pattern: 'bitcoin wallet sell', category: 'financial_instruments' },
  { pattern: 'gift card dump', category: 'financial_instruments' },
  // body parts
  { pattern: 'organ for sale', category: 'body_parts' },
  { pattern: 'blood plasma sell', category: 'body_parts' },
];

export async function seedRiskAndModeration(prisma: PrismaClient) {
  for (const rule of DEFAULT_RULES) {
    await prisma.riskRule.upsert({
      where: { code: rule.code },
      create: {
        id: randomUUID(),
        code: rule.code,
        name: rule.name,
        weight: rule.weight,
        enabled: true,
        config: (rule.config ?? undefined) as Prisma.InputJsonValue | undefined,
      },
      update: {
        name: rule.name,
        weight: rule.weight,
        enabled: true,
        config: (rule.config ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  }

  for (const kw of KEYWORDS) {
    const existing = await prisma.moderationKeyword.findFirst({
      where: { pattern: kw.pattern, category: kw.category },
    });
    if (existing) {
      await prisma.moderationKeyword.update({
        where: { id: existing.id },
        data: { enabled: true },
      });
      continue;
    }
    await prisma.moderationKeyword.create({
      data: {
        id: randomUUID(),
        pattern: kw.pattern,
        category: kw.category,
        enabled: true,
      },
    });
  }

  // eslint-disable-next-line no-console
  console.info(
    `[seed] Risk rules: ${DEFAULT_RULES.length}; moderation keywords: ${KEYWORDS.length}`,
  );
}
