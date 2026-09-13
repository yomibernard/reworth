import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { CommunitiesModule } from '../communities/communities.module';
import { MovingSalesModule } from '../moving-sales/moving-sales.module';
import { PrismaModule } from '../prisma/prisma.module';
import { DiscoveryAnalyticsService } from '../discovery/discovery-analytics.service';
import { HomeCache } from './home.cache';
import { HomeController } from './home.controller';
import { HomeService } from './home.service';
import { RecommendationService } from './recommendation.service';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    AuthModule,
    MovingSalesModule,
    CommunitiesModule,
  ],
  controllers: [HomeController],
  providers: [
    HomeService,
    HomeCache,
    RecommendationService,
    DiscoveryAnalyticsService,
  ],
  exports: [HomeService],
})
export class HomeModule {}
