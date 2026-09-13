import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { AdminRole } from '@prisma/client';
import { Reflector } from '@nestjs/core';
import { AuditService } from '../audit/audit.service';
import { AdminOnlyGuard } from '../common/guards/admin-only.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ROLES_KEY } from '../common/decorators/roles.decorator';
import { buildKpiShape } from './admin-dashboard.service';

describe('AdminOnlyGuard', () => {
  it('rejects user without roles on /admin/dashboard with 403', async () => {
    const audit = { log: jest.fn().mockResolvedValue(null) };
    const guard = new AdminOnlyGuard(audit as unknown as AuditService);
    const ctx = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: { id: 'consumer-1', roles: [] },
          path: '/api/v1/admin/dashboard/kpis',
        }),
      }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'ADMIN_ONLY_DENIED' }),
    );
  });

  it('allows user with admin roles', async () => {
    const audit = { log: jest.fn() };
    const guard = new AdminOnlyGuard(audit as unknown as AuditService);
    const ctx = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: { id: 'admin-1', roles: [AdminRole.OPERATIONS] },
        }),
      }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });
});

describe('admin-rbac — CONTENT_MODERATOR', () => {
  function rolesGuard(required: AdminRole[]) {
    const audit = { log: jest.fn().mockResolvedValue(null) };
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(required),
    };
    return {
      guard: new RolesGuard(
        reflector as unknown as Reflector,
        audit as unknown as AuditService,
      ),
      audit,
      reflector,
    };
  }

  const cases: Array<{
    name: string;
    required: AdminRole[];
    roles: AdminRole[];
    expectOk: boolean;
  }> = [
    {
      name: '403 on /admin/orders/:id/refund',
      required: [AdminRole.FINANCE, AdminRole.SUPER_ADMIN],
      roles: [AdminRole.CONTENT_MODERATOR],
      expectOk: false,
    },
    {
      name: '403 on /admin/finance/summary',
      required: [AdminRole.FINANCE, AdminRole.SUPER_ADMIN],
      roles: [AdminRole.CONTENT_MODERATOR],
      expectOk: false,
    },
    {
      name: 'allowed on listings approve',
      required: [
        AdminRole.SUPER_ADMIN,
        AdminRole.OPERATIONS,
        AdminRole.CONTENT_MODERATOR,
      ],
      roles: [AdminRole.CONTENT_MODERATOR],
      expectOk: true,
    },
  ];

  it.each(cases)('$name', async ({ required, roles, expectOk }) => {
    const { guard, audit } = rolesGuard(required);
    const ctx = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({
          user: { id: 'mod-1', roles },
          path: '/api/v1/admin/test',
        }),
      }),
    } as unknown as ExecutionContext;

    if (expectOk) {
      await expect(guard.canActivate(ctx)).resolves.toBe(true);
    } else {
      await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'RBAC_DENIED' }),
      );
    }
    expect(audit.log).toBeDefined();
    void ROLES_KEY;
  });
});

describe('audit — suspend user', () => {
  it('creates AuditLog on suspend', async () => {
    const auditLog = jest.fn().mockResolvedValue({ id: 'a1' });
    const notify = jest.fn().mockResolvedValue({ created: [], skipped: [] });
    const revoke = jest.fn().mockResolvedValue(undefined);
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'u1',
          status: 'ACTIVE',
        }),
        update: jest.fn().mockResolvedValue({ id: 'u1', status: 'SUSPENDED' }),
      },
    };

    const { AdminPortalService } = await import('./admin-portal.service');
    const service = new AdminPortalService(
      prisma as never,
      { revokeAllRefreshTokens: revoke } as never,
      { log: auditLog } as never,
      { notify } as never,
      {} as never,
    );

    await service.suspendUser(
      { id: 'admin-1', roles: [AdminRole.RISK_FRAUD] },
      'u1',
      'fraud',
      '127.0.0.1',
    );

    expect(revoke).toHaveBeenCalledWith('u1');
    expect(auditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'USER_SUSPENDED',
        entityType: 'User',
        entityId: 'u1',
      }),
    );
  });
});

describe('AdminDashboardService KPI shape', () => {
  it('returns KPI shape with fixture aggregates', () => {
    const shape = buildKpiShape({
      days: 30,
      mau: 12,
      newListings: 5,
      activeListings: 40,
      transactionsCompleted: 3,
      gmvKobo: 150_000_00,
      sellThroughRate: 0.25,
      medianTimeToSaleHours: 48,
      fraudRate: 0.02,
      openDisputes: 1,
      byCommunity: [{ community: 'Lekki', listings: 10, gmvKobo: 50_000_00 }],
    });

    expect(shape).toEqual(
      expect.objectContaining({
        days: 30,
        mau: 12,
        newListings: 5,
        activeListings: 40,
        transactionsCompleted: 3,
        gmvKobo: 150_000_00,
        sellThroughRate: 0.25,
        medianTimeToSaleHours: 48,
        fraudRate: 0.02,
        openDisputes: 1,
        byCommunity: expect.any(Array),
      }),
    );
  });

  it('kpis() returns full shape via mocked prisma', async () => {
    const prisma = {
      listingEvent: {
        findMany: jest.fn().mockResolvedValue([{ actorUserId: 'a' }]),
      },
      order: {
        findMany: jest
          .fn()
          .mockResolvedValueOnce([
            { buyerId: 'b', sellerId: 's' },
          ])
          .mockResolvedValueOnce([
            {
              amountKobo: 1000,
              totalKobo: 1100,
              createdAt: new Date('2026-01-01'),
              completedAt: new Date('2026-01-03'),
              listing: { community: 'Lekki' },
            },
          ]),
      },
      message: {
        findMany: jest.fn().mockResolvedValue([{ senderId: 'm' }]),
      },
      listing: {
        count: jest
          .fn()
          .mockResolvedValueOnce(5)
          .mockResolvedValueOnce(40)
          .mockResolvedValueOnce(8)
          .mockResolvedValueOnce(2)
          .mockResolvedValueOnce(5),
        groupBy: jest
          .fn()
          .mockResolvedValue([{ community: 'Lekki', _count: { _all: 5 } }]),
      },
      dispute: { count: jest.fn().mockResolvedValue(1) },
      riskEvent: { count: jest.fn().mockResolvedValue(1) },
    };

    const { AdminDashboardService } = await import('./admin-dashboard.service');
    const service = new AdminDashboardService(prisma as never);
    const result = await service.kpis(30);

    expect(result.days).toBe(30);
    expect(result.mau).toBeGreaterThanOrEqual(1);
    expect(result).toHaveProperty('gmvKobo');
    expect(result).toHaveProperty('sellThroughRate');
    expect(result).toHaveProperty('medianTimeToSaleHours');
    expect(result).toHaveProperty('fraudRate');
    expect(result).toHaveProperty('openDisputes');
    expect(result).toHaveProperty('byCommunity');
    expect(Array.isArray(result.byCommunity)).toBe(true);
  });
});
