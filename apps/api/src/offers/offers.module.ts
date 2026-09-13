import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { ChatModule } from '../chat/chat.module';
import { PrismaModule } from '../prisma/prisma.module';
import { OfferExpiryScheduler } from './offer-expiry.scheduler';
import { OffersController } from './offers.controller';
import { OffersService } from './offers.service';

@Module({
  imports: [PrismaModule, AuthModule, ConfigModule, ChatModule],
  controllers: [OffersController],
  providers: [OffersService, OfferExpiryScheduler],
  exports: [OffersService, OfferExpiryScheduler],
})
export class OffersModule {}
