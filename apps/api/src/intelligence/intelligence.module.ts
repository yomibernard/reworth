import { Logger, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../prisma/prisma.module';
import { FraudRulesService } from '../listings/fraud-rules.service';
import { ExperimentsService } from './experiments.service';
import { FeatureStoreService } from './feature-store.service';
import { IntelligenceController } from './intelligence.controller';
import { RecommendationService } from './recommendation.service';
import { REC_PROVIDER } from './rec-provider';
import { SavedSearchAlertsScheduler } from './saved-search-alerts.scheduler';
import { SavedSearchAlertsService } from './saved-search-alerts.service';
import { SavedSearchDigestScheduler } from './saved-search-digest.scheduler';
import { SellerAnalyticsService } from './seller-analytics.service';
import { SoldDataValuationProvider } from './sold-data-valuation.provider';
import { VALUATION_PROVIDER } from './valuation.provider';
import { ValuationRefreshScheduler } from './valuation-refresh.scheduler';
import { WeightedRecProvider } from './weighted-rec.provider';

@Module({
  imports: [ConfigModule, PrismaModule, AuthModule, NotificationsModule],
  controllers: [IntelligenceController],
  providers: [
    FeatureStoreService,
    ExperimentsService,
    WeightedRecProvider,
    {
      provide: REC_PROVIDER,
      useExisting: WeightedRecProvider,
    },
    RecommendationService,
    SavedSearchAlertsService,
    SavedSearchAlertsScheduler,
    SavedSearchDigestScheduler,
    FraudRulesService,
    SoldDataValuationProvider,
    {
      provide: VALUATION_PROVIDER,
      useExisting: SoldDataValuationProvider,
    },
    ValuationRefreshScheduler,
    SellerAnalyticsService,
  ],
  exports: [
    REC_PROVIDER,
    RecommendationService,
    FeatureStoreService,
    ExperimentsService,
    VALUATION_PROVIDER,
    SoldDataValuationProvider,
    SavedSearchAlertsService,
    SellerAnalyticsService,
  ],
})
export class IntelligenceModule {
  private readonly logger = new Logger(IntelligenceModule.name);
  constructor() {
    this.logger.log('Intelligence module loaded (Phase 2.3)');
  }
}
