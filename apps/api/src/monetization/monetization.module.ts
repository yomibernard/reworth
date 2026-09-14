import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { createPaymentProvider } from '../orders/orders.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PAYMENT_PROVIDER } from '../providers/payment.provider';
import { FeeConfigService } from './fee-config.service';
import { FinanceDashboardService } from './finance-dashboard.service';
import { MonetizationController } from './monetization.controller';
import { ReconciliationService } from './reconciliation.service';
import { RevenueLedgerService } from './revenue-ledger.service';
import { SellerPromotionsService } from './seller-promotions.service';
import { SellerSubscriptionService } from './seller-subscription.service';

@Module({
  imports: [PrismaModule, AuthModule, ConfigModule, AuditModule],
  controllers: [MonetizationController],
  providers: [
    FeeConfigService,
    RevenueLedgerService,
    SellerPromotionsService,
    SellerSubscriptionService,
    ReconciliationService,
    FinanceDashboardService,
    {
      provide: PAYMENT_PROVIDER,
      useFactory: createPaymentProvider,
      inject: [ConfigService],
    },
  ],
  exports: [
    FeeConfigService,
    RevenueLedgerService,
    SellerPromotionsService,
    SellerSubscriptionService,
    ReconciliationService,
    FinanceDashboardService,
  ],
})
export class MonetizationModule {}
