import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { AdminModule } from './admin/admin.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { ChatModule } from './chat/chat.module';
import { AppThrottlerGuard } from './common/guards/app-throttler.guard';
import { DeliveryModule } from './delivery/delivery.module';
import { DisputesModule } from './disputes/disputes.module';
import { FavouritesModule } from './favourites/favourites.module';
import { HealthModule } from './health/health.module';
import { HomeModule } from './home/home.module';
import { IdentityModule } from './identity/identity.module';
import { ListingsModule } from './listings/listings.module';
import { MediaModule } from './media/media.module';
import { ModerationModule } from './moderation/moderation.module';
import { NotificationsModule } from './notifications/notifications.module';
import { OffersModule } from './offers/offers.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { PrismaModule } from './prisma/prisma.module';
import { ReviewsModule } from './reviews/reviews.module';
import { RiskModule } from './risk/risk.module';
import { SearchModule } from './search/search.module';
import { SwapModule } from './swap/swap.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { singleLine: true } }
            : undefined,
        autoLogging: true,
      },
    }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000,
        limit: 120,
      },
      {
        name: 'auth',
        ttl: 60_000,
        limit: 20,
      },
      {
        name: 'search',
        ttl: 60_000,
        limit: 60,
      },
      {
        name: 'upload',
        ttl: 60_000,
        limit: 30,
      },
    ]),
    PrismaModule,
    AuditModule,
    HealthModule,
    AuthModule,
    UsersModule,
    IdentityModule,
    AdminModule,
    MediaModule,
    ListingsModule,
    RiskModule,
    ModerationModule,
    SearchModule,
    HomeModule,
    FavouritesModule,
    ChatModule,
    OffersModule,
    SwapModule,
    NotificationsModule,
    DeliveryModule,
    OrdersModule,
    PaymentsModule,
    DisputesModule,
    ReviewsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AppThrottlerGuard,
    },
  ],
})
export class AppModule {}
