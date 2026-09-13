import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { AdminOnlyGuard } from '../common/guards/admin-only.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { NotificationsModule } from '../notifications/notifications.module';
import { createPaymentProvider } from '../orders/orders.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PAYMENT_PROVIDER } from '../providers/payment.provider';
import { BulkUploadService } from './bulk-upload.service';
import { ProAccountsService } from './pro-accounts.service';
import { ProController } from './pro.controller';

@Module({
  imports: [PrismaModule, AuthModule, ConfigModule, NotificationsModule],
  controllers: [ProController],
  providers: [
    ProAccountsService,
    BulkUploadService,
    RolesGuard,
    AdminOnlyGuard,
    {
      provide: PAYMENT_PROVIDER,
      useFactory: createPaymentProvider,
      inject: [ConfigService],
    },
  ],
  exports: [ProAccountsService, BulkUploadService],
})
export class ProModule {}
