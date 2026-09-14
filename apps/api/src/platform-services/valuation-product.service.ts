import { Inject, Injectable, Optional } from '@nestjs/common';
import { normalizeCity } from '../intelligence/city-scope';
import {
  VALUATION_PROVIDER,
  type ValuationProvider,
} from '../intelligence/valuation.provider';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

export type ValuationCardDto = {
  id: string;
  city: string;
  currency: 'NGN';
  estimatedLowKobo: number;
  estimatedHighKobo: number;
  recommendedKobo: number;
  quickSaleKobo: number;
  maxValueKobo: number;
  estimatedLowNaira: number;
  estimatedHighNaira: number;
  recommendedNaira: number;
  confidenceLabel: string;
  basis: string;
  shareUrl: string;
  ctaList: { label: string; href: string };
  ctaSell: { label: string; href: string };
  photoKey?: string | null;
  listingId?: string | null;
};

@Injectable()
export class ValuationProductService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional()
    @Inject(VALUATION_PROVIDER)
    private readonly valuation?: ValuationProvider,
  ) {}

  async value(input: {
    userId?: string | null;
    photoKey?: string;
    listingId?: string;
    city?: string;
  }): Promise<ValuationCardDto> {
    const city = normalizeCity(input.city);
    let result: Record<string, unknown>;

    if (input.listingId && this.valuation) {
      const listing = await this.prisma.listing.findUnique({
        where: { id: input.listingId },
      });
      if (listing) {
        const v = await this.valuation.value({
          id: listing.id,
          city: listing.city,
          categoryId: listing.categoryId,
          brand: listing.brand,
          condition: listing.condition,
          priceKobo: listing.priceKobo,
          title: listing.title,
          model: listing.model,
          originalPriceKobo: listing.originalPriceKobo,
        });
        result = { ...v };
      } else {
        result = this.mockPhotoValuation(city, input.photoKey);
      }
    } else {
      result = this.mockPhotoValuation(city, input.photoKey);
    }

    const log = await this.prisma.valuationLog.create({
      data: {
        userId: input.userId ?? null,
        city,
        source: input.listingId ? 'listing' : input.photoKey ? 'photo' : 'brief',
        photoKey: input.photoKey ?? null,
        listingId: input.listingId ?? null,
        result: result as Prisma.InputJsonValue,
      },
    });

    const low = Number(result.estimatedLowKobo ?? 50_000_00);
    const high = Number(result.estimatedHighKobo ?? 120_000_00);
    const rec = Number(result.recommendedKobo ?? Math.round((low + high) / 2));
    const quick = Number(result.quickSaleKobo ?? Math.round(rec * 0.9));
    const max = Number(result.maxValueKobo ?? Math.round(rec * 1.1));

    return {
      id: log.id,
      city,
      currency: 'NGN',
      estimatedLowKobo: low,
      estimatedHighKobo: high,
      recommendedKobo: rec,
      quickSaleKobo: quick,
      maxValueKobo: max,
      estimatedLowNaira: Math.round(low / 100),
      estimatedHighNaira: Math.round(high / 100),
      recommendedNaira: Math.round(rec / 100),
      confidenceLabel: String(
        result.confidenceLabel ?? 'Estimate based on Lagos comps',
      ),
      basis: String(result.basis ?? 'rule_based_mock'),
      shareUrl: `/valuations/${log.id}`,
      ctaList: {
        label: 'Browse similar',
        href: `/search?city=${encodeURIComponent(city)}`,
      },
      ctaSell: {
        label: 'Sell yours',
        href: '/sell/new',
      },
      photoKey: input.photoKey ?? null,
      listingId: input.listingId ?? null,
    };
  }

  private mockPhotoValuation(city: string, photoKey?: string) {
    const seed = (photoKey ?? 'default').length;
    const mid = (80_000 + seed * 1_200) * 100;
    return {
      city,
      currency: 'NGN',
      estimatedLowKobo: Math.round(mid * 0.85),
      estimatedHighKobo: Math.round(mid * 1.2),
      recommendedKobo: mid,
      quickSaleKobo: Math.round(mid * 0.9),
      maxValueKobo: Math.round(mid * 1.15),
      confidenceLabel: 'Photo estimate (mock)',
      basis: 'rule_based_mock',
      sampleCount: 0,
    };
  }
}
