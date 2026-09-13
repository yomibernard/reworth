import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FraudRulesService } from './fraud-rules.service';

@Injectable()
export class PriceIntelligenceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fraud: FraudRulesService,
  ) {}

  async getForListing(listingId: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
    });
    if (!listing) throw new NotFoundException('Listing not found');

    const lowKobo = this.fraud.estimateLowKobo(listing);
    const blob = `${listing.brand ?? ''} ${listing.title}`.toLowerCase();

    let low = lowKobo;
    let high = lowKobo > 0 ? Math.round(lowKobo * 1.25) : 0;
    let recommended = lowKobo > 0 ? Math.round(lowKobo * 1.1) : 0;

    if (/samsung/.test(blob) && /tv|television/.test(blob)) {
      low = 280_000 * 100;
      high = 340_000 * 100;
      recommended = 310_000 * 100;
    } else if (listing.priceKobo > 0 && low === 0) {
      recommended = listing.priceKobo;
      low = Math.round(listing.priceKobo * 0.85);
      high = Math.round(listing.priceKobo * 1.15);
    }

    return {
      listingId,
      currency: 'NGN',
      estimatedLowKobo: low,
      estimatedHighKobo: high,
      recommendedKobo: recommended,
      estimatedLowNaira: Math.round(low / 100),
      estimatedHighNaira: Math.round(high / 100),
      recommendedNaira: Math.round(recommended / 100),
      basis: 'rule_based_mock',
    };
  }
}
