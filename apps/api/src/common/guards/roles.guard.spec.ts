import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AdminRole } from '@prisma/client';
import { AuditService } from '../../audit/audit.service';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { RolesGuard } from './roles.guard';

describe('RolesGuard — Support vs Finance', () => {
  it('denies CUSTOMER_SUPPORT on FINANCE route and audits', async () => {
    const audit = { log: jest.fn().mockResolvedValue(null) };
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([AdminRole.FINANCE]),
    };
    const guard = new RolesGuard(
      reflector as unknown as Reflector,
      audit as unknown as AuditService,
    );

    const ctx = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({
          user: { id: 'support-1', roles: [AdminRole.CUSTOMER_SUPPORT] },
          ip: '127.0.0.1',
          path: '/api/v1/admin/finance/summary',
        }),
      }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'RBAC_DENIED',
        entityType: 'Route',
      }),
    );
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
      ROLES_KEY,
      expect.any(Array),
    );
  });

  it('allows FINANCE on finance route', async () => {
    const audit = { log: jest.fn() };
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([AdminRole.FINANCE]),
    };
    const guard = new RolesGuard(
      reflector as unknown as Reflector,
      audit as unknown as AuditService,
    );
    const ctx = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({
          user: { id: 'fin-1', roles: [AdminRole.FINANCE] },
          path: '/api/v1/admin/finance/summary',
        }),
      }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });
});
