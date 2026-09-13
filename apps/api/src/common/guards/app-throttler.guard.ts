import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Skips rate limiting when DISABLE_THROTTLE=1 (staging k6 / local load tests).
 * Production must leave this unset.
 */
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (process.env.DISABLE_THROTTLE === '1') {
      return true;
    }
    return super.canActivate(context);
  }
}
