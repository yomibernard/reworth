import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { MonetizationModule } from '../monetization/monetization.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { OrdersModule, createPaymentProvider } from '../orders/orders.module';
import { PAYMENT_PROVIDER } from '../providers/payment.provider';
import { PrismaModule } from '../prisma/prisma.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    ConfigModule,
    NotificationsModule,
    MonetizationModule,
    forwardRef(() => OrdersModule),
  ],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    {
      provide: PAYMENT_PROVIDER,
      useFactory: createPaymentProvider,
      inject: [ConfigService],
    },
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
