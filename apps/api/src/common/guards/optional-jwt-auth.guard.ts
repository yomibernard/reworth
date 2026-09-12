import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** JWT if present; otherwise continue as anonymous (req.user undefined). */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser>(err: Error | null, user: TUser): TUser | null {
    if (err || !user) return null;
    return user;
  }

  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<{ headers: { authorization?: string } }>();
    if (!req.headers.authorization) {
      return true;
    }
    return super.canActivate(context) as boolean | Promise<boolean>;
  }
}
