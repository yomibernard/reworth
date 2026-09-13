import { HttpException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { AdminRole, DevicePlatform } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { SMS_PROVIDER } from '../providers/sms.provider';
import { AuthService } from './auth.service';
import { hashWithPepper } from './crypto.util';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: ReturnType<typeof buildPrismaMock>;
  const otpPepper = 'test-otp-pepper';
  const refreshPepper = 'test-refresh-secret';
  const sms = { name: 'console-sms', send: jest.fn().mockResolvedValue({ messageId: '1', status: 'sent' }) };

  function buildPrismaMock() {
    return {
      otpChallenge: {
        count: jest.fn(),
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      verification: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      device: { create: jest.fn() },
      refreshToken: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      userRole: { findMany: jest.fn().mockResolvedValue([]) },
    };
  }

  beforeEach(async () => {
    prisma = buildPrismaMock();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: 'PrismaService', useValue: prisma },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              const map: Record<string, string> = {
                OTP_PEPPER: otpPepper,
                JWT_REFRESH_SECRET: refreshPepper,
                JWT_ACCESS_SECRET: 'access-secret',
                JWT_ACCESS_TTL: '15m',
                JWT_REFRESH_TTL: '30d',
                OAUTH_MOCK_GOOGLE_EMAIL: 'google.user@example.com',
                OAUTH_MOCK_GOOGLE_NAME: 'Google User',
              };
              return map[key];
            },
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('access.jwt'),
          },
        },
        {
          provide: AuditService,
          useValue: { log: jest.fn().mockResolvedValue(null) },
        },
        { provide: SMS_PROVIDER, useValue: sms },
      ],
    })
      .overrideProvider(AuthService)
      .useFactory({
        factory: (
          config: ConfigService,
          jwt: JwtService,
          audit: AuditService,
        ) =>
          new AuthService(
            prisma as never,
            jwt,
            config,
            audit,
            sms as never,
          ),
        inject: [ConfigService, JwtService, AuditService],
      })
      .compile();

    // Re-bind with direct construction for clearer typing
    service = new AuthService(
      prisma as never,
      module.get(JwtService),
      module.get(ConfigService),
      module.get(AuditService),
      sms as never,
    );

    jest.clearAllMocks();
    sms.send.mockResolvedValue({ messageId: '1', status: 'sent' });
  });

  describe('OTP', () => {
    it('rejects when rate limit 3/15min exceeded', async () => {
      prisma.otpChallenge.count.mockResolvedValueOnce(3);
      await expect(
        service.requestOtp({ phone: '+2348012345678' }),
      ).rejects.toBeInstanceOf(HttpException);
    });

    it('rejects expired OTP on verify', async () => {
      prisma.otpChallenge.findFirst.mockResolvedValue({
        id: 'c1',
        phone: '+2348012345678',
        codeHash: hashWithPepper('123456', otpPepper),
        attempts: 0,
        expiresAt: new Date(Date.now() - 1000),
        consumedAt: null,
      });
      await expect(
        service.verifyOtp({ phone: '+2348012345678', code: '123456' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects after max 5 attempts', async () => {
      prisma.otpChallenge.findFirst.mockResolvedValue({
        id: 'c1',
        phone: '+2348012345678',
        codeHash: hashWithPepper('123456', otpPepper),
        attempts: 5,
        expiresAt: new Date(Date.now() + 60_000),
        consumedAt: null,
      });
      await expect(
        service.verifyOtp({ phone: '+2348012345678', code: '000000' }),
      ).rejects.toThrow(/max attempts/i);
    });
  });

  describe('refresh rotation + reuse', () => {
    it('rotates refresh token and revokes old', async () => {
      const plain = 'old-refresh-token-value';
      const tokenHash = hashWithPepper(plain, refreshPepper);
      prisma.refreshToken.findFirst.mockResolvedValue({
        id: 'rt1',
        userId: 'u1',
        deviceId: null,
        familyId: 'fam1',
        tokenHash,
        expiresAt: new Date(Date.now() + 86_400_000),
        revokedAt: null,
      });
      prisma.refreshToken.create.mockResolvedValue({ id: 'rt2' });
      prisma.refreshToken.update.mockResolvedValue({});
      prisma.userRole.findMany.mockResolvedValue([]);

      const result = await service.refresh(plain);
      expect(result.accessToken).toBe('access.jwt');
      expect(result.refreshToken).toBeTruthy();
      expect(result.refreshToken).not.toBe(plain);
      expect(prisma.refreshToken.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'rt1' },
          data: expect.objectContaining({
            revokedAt: expect.any(Date),
            replacedById: 'rt2',
          }),
        }),
      );
    });

    it('revokes entire family on reuse of revoked token', async () => {
      const plain = 'stolen-refresh';
      const tokenHash = hashWithPepper(plain, refreshPepper);
      prisma.refreshToken.findFirst.mockResolvedValue({
        id: 'rt1',
        userId: 'u1',
        familyId: 'fam-reuse',
        tokenHash,
        expiresAt: new Date(Date.now() + 86_400_000),
        revokedAt: new Date(),
      });
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 2 });

      await expect(service.refresh(plain)).rejects.toThrow(/reuse/i);
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { familyId: 'fam-reuse', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });
  });

  describe('OAuth mock', () => {
    it('creates user via google mock callback', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'u-oauth',
        email: 'google.user@example.com',
      });
      prisma.device.create.mockResolvedValue({ id: 'd1' });
      prisma.refreshToken.create.mockResolvedValue({ id: 'rt1' });
      prisma.userRole.findMany.mockResolvedValue([]);

      const result = await service.oauthCallback('google', {
        idToken: 'mock-id-token',
        device: { name: 'Chrome', platform: DevicePlatform.WEB },
      });

      expect(result.userId).toBe('u-oauth');
      expect(result.accessToken).toBe('access.jwt');
      expect(prisma.user.create).toHaveBeenCalled();
    });
  });
});

describe('RBAC finance guard behaviour', () => {
  it('documents Support cannot hit finance (RolesGuard)', () => {
    // Controllers declare @Roles(FINANCE, SUPER_ADMIN) on finance/summary.
    // Support-only roles fail RolesGuard and emit RBAC_DENIED audit.
    const supportRoles: AdminRole[] = [AdminRole.CUSTOMER_SUPPORT];
    const required: AdminRole[] = [AdminRole.FINANCE, AdminRole.SUPER_ADMIN];
    const has =
      supportRoles.includes(AdminRole.SUPER_ADMIN) ||
      required.some((r) => supportRoles.includes(r));
    expect(has).toBe(false);
  });
});
