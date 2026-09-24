import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Optional,
  UnauthorizedException,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  AdminRole,
  DevicePlatform,
  UserStatus,
  VerificationLevel,
  VerificationStatus,
} from '@prisma/client';
import { SMS_PROVIDER, type SmsProvider } from '../providers/sms.provider';
import {
  WHATSAPP_PROVIDER,
  type WhatsAppProvider,
} from '../providers/whatsapp.provider';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ReferralsService } from '../referrals/referrals.service';
import {
  generateOtpCode,
  hashPassword,
  hashWithPepper,
  newFamilyId,
  newRefreshTokenPlain,
  normalizePhone,
  parseTtlToMs,
  verifyPassword,
} from './crypto.util';
import type {
  DeviceDto,
  LoginDto,
  OAuthCallbackDto,
  OtpRequestDto,
  OtpVerifyDto,
  RegisterDto,
} from './dto/auth.dto';

type TokenPair = {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
    @Inject(SMS_PROVIDER) private readonly sms: SmsProvider,
    @Inject(WHATSAPP_PROVIDER) private readonly whatsapp: WhatsAppProvider,
    @Optional()
    @Inject(forwardRef(() => ReferralsService))
    private readonly referrals?: ReferralsService,
  ) {}

  private get otpPepper(): string {
    return this.config.get<string>('OTP_PEPPER') ?? 'dev-otp-pepper';
  }

  private get refreshPepper(): string {
    return (
      this.config.get<string>('JWT_REFRESH_SECRET') ?? 'dev-refresh-secret'
    );
  }

  private get accessTtl(): string {
    return this.config.get<string>('JWT_ACCESS_TTL') ?? '24h';
  }

  private get refreshTtl(): string {
    return this.config.get<string>('JWT_REFRESH_TTL') ?? '30d';
  }

  async requestOtp(dto: OtpRequestDto, ip?: string) {
    const phone = normalizePhone(dto.phone);
    const now = new Date();
    const fifteenMinAgo = new Date(now.getTime() - 15 * 60_000);
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60_000);
    // Mock SMS (local / Expo): higher ceilings so QA isn't blocked by 429s.
    const mockSms = this.sms.name === 'console-sms';
    const maxPer15 = mockSms ? 20 : 3;
    const maxPerDay = mockSms ? 100 : 5;

    const recent15 = await this.prisma.otpChallenge.count({
      where: { phone, createdAt: { gte: fifteenMinAgo } },
    });
    if (recent15 >= maxPer15) {
      throw new HttpException(
        'Too many OTP requests. Try again in 15 minutes.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const recentDay = await this.prisma.otpChallenge.count({
      where: { phone, createdAt: { gte: dayAgo } },
    });
    if (recentDay >= maxPerDay) {
      throw new HttpException(
        'Daily OTP limit reached. Try again tomorrow.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const code = generateOtpCode(6);
    const codeHash = hashWithPepper(code, this.otpPepper);
    const expiresAt = new Date(now.getTime() + 5 * 60_000);
    const body = `Your ReWorth code is ${code}. Valid for 5 minutes.`;
    const idempotencyKey = `otp:${phone}:${expiresAt.getTime()}`;

    await this.prisma.otpChallenge.create({
      data: { phone, codeHash, expiresAt },
    });

    // Deliver the same 6-digit code on SMS and WhatsApp at the same time.
    const [smsResult, waResult] = await Promise.allSettled([
      this.sms.send({
        to: phone,
        body,
        idempotencyKey: `${idempotencyKey}:sms`,
      }),
      this.whatsapp.sendOtp({
        to: phone,
        code,
        body,
        idempotencyKey: `${idempotencyKey}:whatsapp`,
      }),
    ]);

    const channels: Array<'sms' | 'whatsapp'> = [];
    if (smsResult.status === 'fulfilled' && smsResult.value.status !== 'failed') {
      channels.push('sms');
    }
    if (waResult.status === 'fulfilled' && waResult.value.status !== 'failed') {
      channels.push('whatsapp');
    }

    await this.audit.log({
      action: 'OTP_REQUESTED',
      entityType: 'OtpChallenge',
      entityId: phone,
      ip: ip ?? null,
      afterJson: { channels },
    });

    const mockMessaging =
      (this.sms.name === 'console-sms' ||
        this.whatsapp.name === 'console-whatsapp') &&
      process.env.NODE_ENV !== 'production';

    return {
      ok: true,
      expiresInSeconds: 300,
      channels,
      // Dev hint only when messaging is mock — never in production with real providers
      ...(mockMessaging ? { debugCode: code } : {}),
    };
  }

  async verifyOtp(dto: OtpVerifyDto, ip?: string): Promise<TokenPair & { userId: string }> {
    const phone = normalizePhone(dto.phone);
    const challenge = await this.prisma.otpChallenge.findFirst({
      where: { phone, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (!challenge) {
      throw new UnauthorizedException('No active OTP challenge');
    }
    if (challenge.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('OTP expired');
    }
    if (challenge.attempts >= 5) {
      throw new UnauthorizedException('OTP max attempts exceeded');
    }

    const expected = hashWithPepper(dto.code, this.otpPepper);
    if (expected !== challenge.codeHash) {
      await this.prisma.otpChallenge.update({
        where: { id: challenge.id },
        data: { attempts: { increment: 1 } },
      });
      throw new UnauthorizedException('Invalid OTP');
    }

    await this.prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: { consumedAt: new Date() },
    });

    let user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          phone,
          phoneVerifiedAt: new Date(),
          status: UserStatus.ACTIVE,
          profile: {
            create: {
              displayName: `User ${phone.slice(-4)}`,
              preferredCommunity: '',
            },
          },
          verifications: {
            create: {
              level: VerificationLevel.L1_PHONE,
              status: VerificationStatus.VERIFIED,
              verifiedAt: new Date(),
            },
          },
        },
      });
    } else {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { phoneVerifiedAt: new Date() },
      });
      const existingL1 = await this.prisma.verification.findFirst({
        where: {
          userId: user.id,
          level: VerificationLevel.L1_PHONE,
          status: VerificationStatus.VERIFIED,
        },
      });
      if (!existingL1) {
        await this.prisma.verification.create({
          data: {
            userId: user.id,
            level: VerificationLevel.L1_PHONE,
            status: VerificationStatus.VERIFIED,
            verifiedAt: new Date(),
          },
        });
      }
    }

    const tokens = await this.issueTokenPair(user.id, dto.device);
    await this.audit.log({
      actorUserId: user.id,
      action: 'OTP_VERIFIED',
      entityType: 'User',
      entityId: user.id,
      ip: ip ?? null,
    });

    if (this.referrals) {
      await this.referrals.ensureCode(user.id).catch(() => undefined);
      if (dto.referralCode) {
        await this.referrals
          .attribute(user.id, {
            code: dto.referralCode,
            deviceFingerprintHash: dto.deviceFingerprintHash,
          })
          .catch(() => undefined);
      }
    }

    return { ...tokens, userId: user.id };
  }

  async register(
    dto: RegisterDto,
    ip?: string,
  ): Promise<TokenPair & { userId: string }> {
    const email = dto.email.trim().toLowerCase();
    if (dto.password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }
    const user = await this.createUserWithPassword({
      email,
      password: dto.password,
      displayName: dto.displayName?.trim() || email.split('@')[0],
    });
    const tokens = await this.issueTokenPair(user.id, dto.device);
    await this.audit.log({
      actorUserId: user.id,
      action: 'REGISTER',
      entityType: 'User',
      entityId: user.id,
      afterJson: { email, method: 'email_password' },
      ip: ip ?? null,
    });
    return { ...tokens, userId: user.id };
  }

  async login(dto: LoginDto, ip?: string): Promise<TokenPair & { userId: string }> {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { roles: true },
    });
    if (!user?.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Account unavailable');
    }
    const ok = await verifyPassword(user.passwordHash, dto.password);
    if (!ok) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.issueTokenPair(user.id, dto.device);
    await this.audit.log({
      actorUserId: user.id,
      actorRole: user.roles[0]?.role ?? null,
      action: 'LOGIN',
      entityType: 'User',
      entityId: user.id,
      ip: ip ?? null,
    });
    return { ...tokens, userId: user.id };
  }

  async refresh(refreshToken: string, ip?: string): Promise<TokenPair> {
    const tokenHash = hashWithPepper(refreshToken, this.refreshPepper);
    const existing = await this.prisma.refreshToken.findFirst({
      where: { tokenHash },
    });

    if (!existing) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Reuse of a revoked/rotated token → revoke entire family
    if (existing.revokedAt) {
      await this.prisma.refreshToken.updateMany({
        where: { familyId: existing.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await this.audit.log({
        actorUserId: existing.userId,
        action: 'REFRESH_REUSE_DETECTED',
        entityType: 'RefreshTokenFamily',
        entityId: existing.familyId,
        ip: ip ?? null,
      });
      throw new UnauthorizedException('Refresh token reuse detected');
    }

    if (existing.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    const plain = newRefreshTokenPlain();
    const newHash = hashWithPepper(plain, this.refreshPepper);
    const expiresAt = new Date(
      Date.now() + parseTtlToMs(this.refreshTtl, 30 * 86_400_000),
    );

    const created = await this.prisma.refreshToken.create({
      data: {
        userId: existing.userId,
        deviceId: existing.deviceId,
        familyId: existing.familyId,
        tokenHash: newHash,
        expiresAt,
      },
    });

    await this.prisma.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date(), replacedById: created.id },
    });

    const accessToken = await this.signAccess(existing.userId);
    return {
      accessToken,
      refreshToken: plain,
      expiresIn: this.accessTtl,
    };
  }

  async logout(refreshToken?: string, userId?: string, ip?: string) {
    if (refreshToken) {
      const tokenHash = hashWithPepper(refreshToken, this.refreshPepper);
      const existing = await this.prisma.refreshToken.findFirst({
        where: { tokenHash },
      });
      if (existing && !existing.revokedAt) {
        await this.prisma.refreshToken.update({
          where: { id: existing.id },
          data: { revokedAt: new Date() },
        });
        await this.audit.log({
          actorUserId: existing.userId,
          action: 'LOGOUT',
          entityType: 'RefreshToken',
          entityId: existing.id,
          ip: ip ?? null,
        });
      }
      return { ok: true };
    }
    if (userId) {
      await this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await this.audit.log({
        actorUserId: userId,
        action: 'LOGOUT',
        entityType: 'User',
        entityId: userId,
        ip: ip ?? null,
      });
    }
    return { ok: true };
  }

  async oauthCallback(
    provider: string,
    dto: OAuthCallbackDto,
    ip?: string,
  ): Promise<TokenPair & { userId: string }> {
    const p = provider.toLowerCase();
    if (p !== 'google' && p !== 'apple') {
      throw new BadRequestException('Unsupported OAuth provider');
    }
    if (!dto.idToken && !dto.code) {
      throw new BadRequestException('idToken or code required');
    }

    // Mock provider: configurable via env or token payload shape
    const mockEmail =
      this.config.get<string>(`OAUTH_MOCK_${p.toUpperCase()}_EMAIL`) ??
      `${p}.user@example.com`;
    const mockName =
      this.config.get<string>(`OAUTH_MOCK_${p.toUpperCase()}_NAME`) ??
      `${p} User`;

    let user = await this.prisma.user.findUnique({
      where: { email: mockEmail },
    });
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: mockEmail,
          emailVerifiedAt: new Date(),
          status: UserStatus.ACTIVE,
          profile: {
            create: {
              displayName: mockName,
              preferredCommunity: '',
            },
          },
          verifications: {
            create: {
              level: VerificationLevel.L2_EMAIL,
              status: VerificationStatus.VERIFIED,
              verifiedAt: new Date(),
            },
          },
        },
      });
    } else if (!user.emailVerifiedAt) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { emailVerifiedAt: new Date() },
      });
    }

    const tokens = await this.issueTokenPair(user.id, dto.device);
    await this.audit.log({
      actorUserId: user.id,
      action: 'OAUTH_LOGIN',
      entityType: 'User',
      entityId: user.id,
      afterJson: { provider: p },
      ip: ip ?? null,
    });
    return { ...tokens, userId: user.id };
  }

  async createUserWithPassword(input: {
    email: string;
    password: string;
    displayName?: string;
    roles?: AdminRole[];
  }) {
    const email = input.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('Email already registered');
    }
    const passwordHash = await hashPassword(input.password);
    return this.prisma.user.create({
      data: {
        email,
        emailVerifiedAt: new Date(),
        passwordHash,
        status: UserStatus.ACTIVE,
        profile: {
          create: {
            displayName: input.displayName ?? email.split('@')[0],
            preferredCommunity: '',
          },
        },
        roles: input.roles?.length
          ? { create: input.roles.map((role) => ({ role })) }
          : undefined,
        verifications: {
          create: {
            level: VerificationLevel.L2_EMAIL,
            status: VerificationStatus.VERIFIED,
            verifiedAt: new Date(),
          },
        },
      },
      include: { roles: true, profile: true },
    });
  }

  private async issueTokenPair(
    userId: string,
    device?: DeviceDto,
  ): Promise<TokenPair> {
    let deviceId: string | undefined;
    if (device) {
      const created = await this.prisma.device.create({
        data: {
          userId,
          name: device.name,
          platform: device.platform ?? DevicePlatform.UNKNOWN,
          lastSeenAt: new Date(),
        },
      });
      deviceId = created.id;
    }

    const accessToken = await this.signAccess(userId);
    const plain = newRefreshTokenPlain();
    const tokenHash = hashWithPepper(plain, this.refreshPepper);
    const expiresAt = new Date(
      Date.now() + parseTtlToMs(this.refreshTtl, 30 * 86_400_000),
    );

    await this.prisma.refreshToken.create({
      data: {
        userId,
        deviceId,
        familyId: newFamilyId(),
        tokenHash,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken: plain,
      expiresIn: this.accessTtl,
    };
  }

  /** Public wrapper for admin session issuance after TOTP. */
  async issueSession(
    userId: string,
    device?: DeviceDto,
  ): Promise<TokenPair> {
    return this.issueTokenPair(userId, device);
  }

  async revokeAllRefreshTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async signAccessToken(userId: string): Promise<string> {
    return this.signAccess(userId);
  }

  private async signAccess(userId: string): Promise<string> {
    const roles = await this.prisma.userRole.findMany({
      where: { userId },
      select: { role: true },
    });
    const roleCodes = roles.map((r) => r.role);
    const isAdmin = roleCodes.length > 0;
    let totpVerified = false;
    if (isAdmin) {
      const totp = await this.prisma.adminTotp.findUnique({
        where: { userId },
        select: { verified: true, enabledAt: true },
      });
      totpVerified = Boolean(totp?.verified && totp.enabledAt);
    }
    return this.jwt.sign(
      {
        sub: userId,
        typ: 'access',
        roles: roleCodes,
        admin: isAdmin,
        totpVerified,
      },
      {
        secret:
          this.config.get<string>('JWT_ACCESS_SECRET') ?? 'dev-access-secret',
        expiresIn: this.accessTtl,
      },
    );
  }
}
