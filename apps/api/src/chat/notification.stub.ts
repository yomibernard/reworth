import { Injectable, Logger } from '@nestjs/common';

/**
 * Phase 4 stub — full notification engine lands in Phase 6.
 * Logs intent so accept/message flows are observable in tests & local.
 */
@Injectable()
export class NotificationStub {
  private readonly logger = new Logger(NotificationStub.name);

  log(
    event: string,
    payload: Record<string, unknown>,
  ): void {
    this.logger.log({ event, ...payload }, `notify:${event}`);
  }
}
