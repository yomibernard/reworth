import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { EMAIL_PROVIDER } from '../providers/email.provider';
import {
  MailhogEmailProvider,
  MockEmailProvider,
} from '../providers/mock-email.provider';
import { MockPushProvider } from '../providers/mock-push.provider';
import { PUSH_PROVIDER } from '../providers/push.provider';
import {
  DevicesController,
  NotificationsController,
} from './notifications.controller';
import { NotificationsService } from './notifications.service';

export function createEmailProvider(config: ConfigService) {
  const provider = (
    config.get<string>('EMAIL_PROVIDER') ?? 'mock'
  ).toLowerCase();
  if (provider === 'mailhog') {
    return new MailhogEmailProvider(
      config.get<string>('SMTP_HOST') ?? 'localhost',
      Number(config.get('SMTP_PORT') ?? 1025),
      config.get<string>('EMAIL_FROM') ?? 'noreply@reworth.local',
    );
  }
  return new MockEmailProvider();
}

export function createPushProvider(config: ConfigService) {
  const provider = (
    config.get<string>('PUSH_PROVIDER') ?? 'mock'
  ).toLowerCase();
  void provider;
  return new MockPushProvider();
}

@Module({
  imports: [PrismaModule, AuthModule, ConfigModule],
  controllers: [NotificationsController, DevicesController],
  providers: [
    NotificationsService,
    {
      provide: PUSH_PROVIDER,
      useFactory: createPushProvider,
      inject: [ConfigService],
    },
    {
      provide: EMAIL_PROVIDER,
      useFactory: createEmailProvider,
      inject: [ConfigService],
    },
  ],
  exports: [NotificationsService, PUSH_PROVIDER, EMAIL_PROVIDER],
})
export class NotificationsModule {}
