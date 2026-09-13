import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { DiscoveryAnalyticsService } from '../discovery/discovery-analytics.service';
import { FavouritesController } from './favourites.controller';
import { FavouritesService } from './favourites.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [FavouritesController],
  providers: [FavouritesService, DiscoveryAnalyticsService],
  exports: [FavouritesService],
})
export class FavouritesModule {}
