import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { AdminOnlyGuard } from '../common/guards/admin-only.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { IntelligenceModule } from '../intelligence/intelligence.module';
import { AnalyticsService } from '../listings/analytics.service';
import { ListingsModule } from '../listings/listings.module';
import { OrdersModule, createPaymentProvider } from '../orders/orders.module';
import { PAYMENT_PROVIDER } from '../providers/payment.provider';
import { PrismaModule } from '../prisma/prisma.module';
import { RoomScanModule } from '../room-scan/room-scan.module';
import { ConsignmentExpiryScheduler } from './consignment.scheduler';
import { ConsignmentService } from './consignment.service';
import { FULFILMENT_SERVICE } from './fulfilment.service';
import { InstantBuySlaScheduler } from './instant-buy.scheduler';
import { InstantBuyService } from './instant-buy.service';
import { ManagedPickupService } from './managed-pickup.service';
import { MockFulfilmentService } from './mock-fulfilment.service';
import { PlatformServicesController } from './platform-services.controller';
import { ValuationProductService } from './valuation-product.service';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    AuthModule,
    forwardRef(() => ListingsModule),
    forwardRef(() => OrdersModule),
    forwardRef(() => IntelligenceModule),
    forwardRef(() => RoomScanModule),
  ],
  controllers: [PlatformServicesController],
  providers: [
    AnalyticsService,
    RolesGuard,
    AdminOnlyGuard,
    MockFulfilmentService,
    {
      provide: FULFILMENT_SERVICE,
      useExisting: MockFulfilmentService,
    },
    {
      provide: PAYMENT_PROVIDER,
      useFactory: createPaymentProvider,
      inject: [ConfigService],
    },
    InstantBuyService,
    InstantBuySlaScheduler,
    ConsignmentService,
    ConsignmentExpiryScheduler,
    ManagedPickupService,
    ValuationProductService,
  ],
  exports: [
    InstantBuyService,
    ConsignmentService,
    ManagedPickupService,
    ValuationProductService,
    FULFILMENT_SERVICE,
  ],
})
export class PlatformServicesModule {}
