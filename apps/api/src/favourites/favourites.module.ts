import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { IntelligenceModule } from '../intelligence/intelligence.module';
import { DiscoveryAnalyticsService } from '../discovery/discovery-analytics.service';
import { FavouritesController } from './favourites.controller';
import { FavouritesService } from './favourites.service';

@Module({
  imports: [PrismaModule, AuthModule, IntelligenceModule],
  controllers: [FavouritesController],
  providers: [FavouritesService, DiscoveryAnalyticsService],
  exports: [FavouritesService],
})
export class FavouritesModule {}
