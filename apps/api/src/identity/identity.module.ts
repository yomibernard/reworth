import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { IdentityController } from './identity.controller';
import { IDENTITY_PROVIDER } from './identity.provider';
import { IdentityService } from './identity.service';
import { MockIdentityProvider } from './mock-identity.provider';

@Module({
  imports: [AuthModule],
  controllers: [IdentityController],
  providers: [
    IdentityService,
    {
      provide: IDENTITY_PROVIDER,
      useFactory: (config: ConfigService) => {
        const mode = config.get<string>('IDENTITY_PROVIDER') ?? 'mock';
        if (mode === 'mock') {
          return new MockIdentityProvider();
        }
        return new MockIdentityProvider();
      },
      inject: [ConfigService],
    },
  ],
  exports: [IdentityService],
})
export class IdentityModule {}
