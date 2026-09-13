import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  log(event: string, props: Record<string, unknown> = {}): void {
    this.logger.debug({ analytics: event, ...props });
  }
}
