import { Module, forwardRef } from '@nestjs/common';
import { ListingsModule } from '../listings/listings.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RiskEngineService } from './risk-engine.service';

@Module({
  imports: [
    PrismaModule,
    NotificationsModule,
    forwardRef(() => ListingsModule),
  ],
  providers: [RiskEngineService],
  exports: [RiskEngineService],
})
export class RiskModule {}
