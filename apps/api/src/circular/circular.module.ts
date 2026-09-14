import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { AdminOnlyGuard } from '../common/guards/admin-only.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CircularController } from './circular.controller';
import { CircularDonateScheduler } from './circular-donate.scheduler';
import { CircularService } from './circular.service';

@Module({
  imports: [PrismaModule, AuthModule, ConfigModule, NotificationsModule],
  controllers: [CircularController],
  providers: [
    CircularService,
    CircularDonateScheduler,
    RolesGuard,
    AdminOnlyGuard,
  ],
  exports: [CircularService],
})
export class CircularModule {}
