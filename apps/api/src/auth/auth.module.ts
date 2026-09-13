import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConsoleSmsMock } from '../providers/console-sms.mock';
import { SMS_PROVIDER } from '../providers/sms.provider';
import { ReferralsModule } from '../referrals/referrals.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_ACCESS_SECRET') ?? 'dev-access-secret',
        signOptions: {
          expiresIn: config.get<string>('JWT_ACCESS_TTL') ?? '15m',
        },
      }),
    }),
    forwardRef(() => ReferralsModule),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    {
      provide: SMS_PROVIDER,
      useFactory: (config: ConfigService) => {
        const provider = config.get<string>('SMS_PROVIDER') ?? 'mock';
        if (provider === 'mock' || provider === 'console') {
          return new ConsoleSmsMock();
        }
        // Phase 1: Termii/Twilio adapters deferred — fall back to console mock
        return new ConsoleSmsMock();
      },
      inject: [ConfigService],
    },
  ],
  exports: [AuthService, JwtModule, PassportModule],
})
export class AuthModule {}
