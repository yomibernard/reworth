import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { AnalyticsService } from '../listings/analytics.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ASSISTANT_PROVIDER } from './assistant.provider';
import { AssistantController } from './assistant.controller';
import { AssistantService } from './assistant.service';
import { BundleService } from './bundle.service';
import { MockAssistantProvider } from './mock-assistant.provider';

@Module({
  imports: [ConfigModule, PrismaModule, AuthModule],
  controllers: [AssistantController],
  providers: [
    AnalyticsService,
    AssistantService,
    BundleService,
    {
      provide: ASSISTANT_PROVIDER,
      inject: [ConfigService],
      useFactory: (_config: ConfigService) => {
        // OpenAI adapter deferred — mock is default (ASSISTANT_PROVIDER=mock)
        return new MockAssistantProvider();
      },
    },
  ],
  exports: [AssistantService, BundleService, ASSISTANT_PROVIDER],
})
export class AssistantModule {}
