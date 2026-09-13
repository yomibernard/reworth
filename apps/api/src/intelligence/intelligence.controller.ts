import {
  Controller,
  Get,
  Header,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import type { Response } from 'express';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { RecommendationService } from './recommendation.service';
import { DEFAULT_CITY, normalizeCity } from './city-scope';
import { SellerAnalyticsService } from './seller-analytics.service';
import type { RecSurface } from './rec-provider';

class RecommendationsQueryDto {
  @IsOptional()
  @IsIn(['home', 'similar', 'post_checkout'])
  surface?: RecSurface;

  @IsOptional()
  @IsUUID()
  listingId?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(40)
  limit?: number;

  @IsOptional()
  @IsString()
  seed?: string;
}

class SellerAnalyticsQueryDto {
  @IsOptional()
  @IsString()
  city?: string;
}

@Controller()
export class IntelligenceController {
  constructor(
    private readonly recommendations: RecommendationService,
    private readonly sellerAnalytics: SellerAnalyticsService,
  ) {}

  @Get('recommendations')
  @UseGuards(OptionalJwtAuthGuard)
  getRecommendations(
    @Query() query: RecommendationsQueryDto,
    @CurrentUser() user: AuthUser | null,
  ) {
    return this.recommendations.recommend({
      userId: user?.id,
      city: normalizeCity(query.city ?? DEFAULT_CITY),
      listingId: query.listingId,
      limit: query.limit ?? 12,
      surface: query.surface ?? 'home',
      seed: query.seed,
    });
  }

  @Get('me/seller-analytics')
  @UseGuards(JwtAuthGuard)
  getSellerAnalytics(
    @CurrentUser() user: AuthUser,
    @Query() query: SellerAnalyticsQueryDto,
  ) {
    return this.sellerAnalytics.getForSeller(user.id, query.city);
  }

  @Get('me/seller-analytics/export.csv')
  @UseGuards(JwtAuthGuard)
  @Header('Content-Type', 'text/csv')
  async exportSellerAnalytics(
    @CurrentUser() user: AuthUser,
    @Query() query: SellerAnalyticsQueryDto,
    @Res() res: Response,
  ) {
    const csv = await this.sellerAnalytics.exportCsv(user.id, query.city);
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="seller-analytics.csv"',
    );
    res.send(csv);
  }
}
