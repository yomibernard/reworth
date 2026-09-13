import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MediaModule } from '../media/media.module';
import { AuthModule } from '../auth/auth.module';
import { FavouritesModule } from '../favourites/favourites.module';
import { ModerationModule } from '../moderation/moderation.module';
import { RiskModule } from '../risk/risk.module';
import {
  AI_LISTING_PROVIDER,
} from '../providers/ai-listing.provider';
import { RuleBasedAiMock } from '../providers/rule-based-ai.mock';
import {
  GEOCODING_PROVIDER,
  MockGeocodingProvider,
} from '../providers/geocoding.provider';
import { AnalyticsService } from './analytics.service';
import { FraudRulesService } from './fraud-rules.service';
import { ListingAssistService } from './listing-assist.service';
import { ListingExpiryScheduler } from './listing-expiry.scheduler';
import { ListingsController } from './listings.controller';
import { ListingsService } from './listings.service';
import { PriceIntelligenceService } from './price-intelligence.service';

@Module({
  imports: [
    ConfigModule,
    MediaModule,
    AuthModule,
    forwardRef(() => FavouritesModule),
    forwardRef(() => RiskModule),
    ModerationModule,
  ],
  controllers: [ListingsController],
  providers: [
    ListingsService,
    AnalyticsService,
    FraudRulesService,
    ListingAssistService,
    PriceIntelligenceService,
    ListingExpiryScheduler,
    {
      provide: AI_LISTING_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const provider = config.get<string>('AI_PROVIDER') ?? 'mock';
        // Phase 2: OpenAI adapter deferred — always rule-based mock unless extended
        void provider;
        return new RuleBasedAiMock();
      },
    },
    {
      provide: GEOCODING_PROVIDER,
      useClass: MockGeocodingProvider,
    },
  ],
  exports: [ListingsService, FraudRulesService, ListingExpiryScheduler],
})
export class ListingsModule {}
