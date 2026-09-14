import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { AnalyticsService } from '../listings/analytics.service';
import { ListingsModule } from '../listings/listings.module';
import {
  AI_LISTING_PROVIDER,
} from '../providers/ai-listing.provider';
import { RuleBasedAiMock } from '../providers/rule-based-ai.mock';
import { PrismaModule } from '../prisma/prisma.module';
import { ROOM_SCAN_VISION_PROVIDER } from './room-scan-vision.provider';
import { MockRoomScanVisionProvider } from './mock-room-scan-vision.provider';
import { RoomScanController } from './room-scan.controller';
import { RoomScanService } from './room-scan.service';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    AuthModule,
    forwardRef(() => ListingsModule),
  ],
  controllers: [RoomScanController],
  providers: [
    AnalyticsService,
    RoomScanService,
    {
      provide: ROOM_SCAN_VISION_PROVIDER,
      useClass: MockRoomScanVisionProvider,
    },
    {
      provide: AI_LISTING_PROVIDER,
      inject: [ConfigService],
      useFactory: () => new RuleBasedAiMock(),
    },
  ],
  exports: [RoomScanService, ROOM_SCAN_VISION_PROVIDER],
})
export class RoomScanModule {}
