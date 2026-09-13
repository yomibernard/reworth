import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../prisma/prisma.module';
import { MovingSaleExpiryScheduler } from './moving-sale-expiry.scheduler';
import { MovingSalesController } from './moving-sales.controller';
import { MovingSalesService } from './moving-sales.service';

@Module({
  imports: [PrismaModule, AuthModule, ConfigModule, NotificationsModule],
  controllers: [MovingSalesController],
  providers: [MovingSalesService, MovingSaleExpiryScheduler],
  exports: [MovingSalesService, MovingSaleExpiryScheduler],
})
export class MovingSalesModule {}
