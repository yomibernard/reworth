import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../prisma/prisma.module';
import { DELIVERY_PROVIDER } from '../providers/delivery.provider';
import { MockDeliveryProvider } from '../providers/mock-delivery.provider';
import {
  DeliveryWebhookController,
  MeetPointsController,
  OrderDeliveryController,
} from './delivery.controller';
import { DeliveryService } from './delivery.service';

export function createDeliveryProvider(config: ConfigService) {
  const provider = (
    config.get<string>('DELIVERY_PROVIDER') ?? 'mock'
  ).toLowerCase();
  void provider;
  return new MockDeliveryProvider();
}

@Module({
  imports: [PrismaModule, AuthModule, ConfigModule, NotificationsModule],
  controllers: [
    MeetPointsController,
    OrderDeliveryController,
    DeliveryWebhookController,
  ],
  providers: [
    DeliveryService,
    {
      provide: DELIVERY_PROVIDER,
      useFactory: createDeliveryProvider,
      inject: [ConfigService],
    },
  ],
  exports: [DeliveryService, DELIVERY_PROVIDER],
})
export class DeliveryModule {}
