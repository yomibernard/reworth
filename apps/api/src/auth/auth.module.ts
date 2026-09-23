import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConsoleSmsMock } from '../providers/console-sms.mock';
import { ConsoleWhatsAppMock } from '../providers/console-whatsapp.mock';
import { SMS_PROVIDER } from '../providers/sms.provider';
import { TermiiSmsProvider } from '../providers/termii-sms.provider';
import { TermiiWhatsAppProvider } from '../providers/termii-whatsapp.provider';
import { WHATSAPP_PROVIDER } from '../providers/whatsapp.provider';
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
          // Consumer mobile default: 24h (refresh still rotates at 30d).
          expiresIn: config.get<string>('JWT_ACCESS_TTL') ?? '24h',
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
        const provider = (config.get<string>('SMS_PROVIDER') ?? 'mock').toLowerCase();
        if (provider === 'termii') {
          const apiKey = config.get<string>('TERMII_API_KEY') ?? '';
          const senderId = config.get<string>('TERMII_SENDER_ID') ?? 'ReWorth';
          const baseUrl =
            config.get<string>('TERMII_BASE_URL') ??
            'https://api.ng.termii.com';
          if (!apiKey) {
            return new ConsoleSmsMock();
          }
          return new TermiiSmsProvider(apiKey, senderId, baseUrl);
        }
        return new ConsoleSmsMock();
      },
      inject: [ConfigService],
    },
    {
      provide: WHATSAPP_PROVIDER,
      useFactory: (config: ConfigService) => {
        const provider = (
          config.get<string>('WHATSAPP_PROVIDER') ??
          config.get<string>('SMS_PROVIDER') ??
          'mock'
        ).toLowerCase();
        if (provider === 'termii') {
          const apiKey = config.get<string>('TERMII_API_KEY') ?? '';
          const deviceId =
            config.get<string>('TERMII_WHATSAPP_DEVICE_ID') ??
            config.get<string>('TERMII_SENDER_ID') ??
            'ReWorth';
          const baseUrl =
            config.get<string>('TERMII_BASE_URL') ??
            'https://api.ng.termii.com';
          if (!apiKey) {
            return new ConsoleWhatsAppMock();
          }
          return new TermiiWhatsAppProvider(apiKey, deviceId, baseUrl);
        }
        return new ConsoleWhatsAppMock();
      },
      inject: [ConfigService],
    },
  ],
  exports: [AuthService, JwtModule, PassportModule],
})
export class AuthModule {}
