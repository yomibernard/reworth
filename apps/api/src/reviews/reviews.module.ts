import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ChatModule } from '../chat/chat.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RolesGuard } from '../common/guards/roles.guard';
import {
  AdminTrustController,
  ReviewsController,
} from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { TrustScoreCron } from './trust-score.cron';
import { TrustScoreService } from './trust-score.service';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    NotificationsModule,
    forwardRef(() => ChatModule),
  ],
  controllers: [ReviewsController, AdminTrustController],
  providers: [
    ReviewsService,
    TrustScoreService,
    TrustScoreCron,
    RolesGuard,
  ],
  exports: [ReviewsService, TrustScoreService],
})
export class ReviewsModule {}
