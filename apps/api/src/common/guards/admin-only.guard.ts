import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { AuthUser } from '../decorators/current-user.decorator';
import { AuditService } from '../../audit/audit.service';

/**
 * Rejects pure consumer JWTs (no AdminRole) on all /admin/* routes.
 */
@Injectable()
export class AdminOnlyGuard implements CanActivate {
  constructor(private readonly audit: AuditService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
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
    if (!user.roles?.length) {
      await this.audit.log({
        actorUserId: user.id,
        action: 'ADMIN_ONLY_DENIED',
        entityType: 'Route',
        entityId: request.path ?? request.url ?? null,
        afterJson: { roles: user.roles },
        ip: request.ip ?? null,
      });
      throw new ForbiddenException('Admin role required');
    }
    return true;
  }
}
