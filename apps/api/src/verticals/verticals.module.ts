import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { AdminOnlyGuard } from '../common/guards/admin-only.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { NotificationsModule } from '../notifications/notifications.module';
import { OrdersModule, createPaymentProvider } from '../orders/orders.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AUTHENTICATION_PROVIDER } from '../providers/authentication.provider';
import { INSPECTION_PROVIDER } from '../providers/inspection.provider';
import { MockAuthenticationProvider } from '../providers/mock-authentication.provider';
import { MockInspectionProvider } from '../providers/mock-inspection.provider';
import { PAYMENT_PROVIDER } from '../providers/payment.provider';
import { LuxuryAuthService } from './luxury-auth.service';
import { VehicleInspectionsService } from './vehicle-inspections.service';
import { VerticalsController } from './verticals.controller';

export function createInspectionProvider(_config: ConfigService) {
  return new MockInspectionProvider();
}

export function createAuthenticationProvider(_config: ConfigService) {
  return new MockAuthenticationProvider();
}

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    ConfigModule,
    NotificationsModule,
    forwardRef(() => OrdersModule),
  ],
  controllers: [VerticalsController],
  providers: [
    VehicleInspectionsService,
    LuxuryAuthService,
    RolesGuard,
    AdminOnlyGuard,
    {
      provide: INSPECTION_PROVIDER,
      useFactory: createInspectionProvider,
      inject: [ConfigService],
    },
    {
      provide: AUTHENTICATION_PROVIDER,
      useFactory: createAuthenticationProvider,
      inject: [ConfigService],
    },
    {
      provide: PAYMENT_PROVIDER,
      useFactory: createPaymentProvider,
      inject: [ConfigService],
    },
  ],
  exports: [VehicleInspectionsService, LuxuryAuthService],
})
export class VerticalsModule {}
