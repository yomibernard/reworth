import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { ChatModule } from '../chat/chat.module';
import { RolesGuard } from '../common/guards/roles.guard';
import { OrdersModule } from '../orders/orders.module';
import { PrismaModule } from '../prisma/prisma.module';
import { DisputeSellerExpiryScheduler } from './dispute-seller-expiry.scheduler';
import { DisputesController } from './disputes.controller';
import { DisputesService } from './disputes.service';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    ConfigModule,
    ChatModule,
    forwardRef(() => OrdersModule),
  ],
  controllers: [DisputesController],
  providers: [DisputesService, DisputeSellerExpiryScheduler, RolesGuard],
  exports: [DisputesService],
})
export class DisputesModule {}
