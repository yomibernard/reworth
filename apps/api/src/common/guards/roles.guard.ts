import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AdminRole } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { AuthUser } from '../decorators/current-user.decorator';
import { AuditService } from '../../audit/audit.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly audit: AuditService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<AdminRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      user?: AuthUser;
      ip?: string;
      path?: string;
      url?: string;
    }>();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    const hasRole =
      user.roles.includes(AdminRole.SUPER_ADMIN) ||
      required.some((r) => user.roles.includes(r));

    if (!hasRole) {
      await this.audit.log({
        actorUserId: user.id,
        actorRole: user.roles[0] ?? null,
        action: 'RBAC_DENIED',
        entityType: 'Route',
        entityId: request.path ?? request.url ?? null,
        afterJson: { required, roles: user.roles },
        ip: request.ip ?? null,
      });
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
