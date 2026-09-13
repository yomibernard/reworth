import { Injectable, Logger } from '@nestjs/common';
import type {
  AuthenticationProvider,
  StartAuthJobInput,
  StartAuthJobResult,
} from './authentication.provider';

@Injectable()
export class MockAuthenticationProvider implements AuthenticationProvider {
  readonly name = 'mock-auth';
  private readonly logger = new Logger(MockAuthenticationProvider.name);
  private readonly jobs = new Map<string, { jobId: string }>();

  async start(input: StartAuthJobInput): Promise<StartAuthJobResult> {
    const partnerRef = `mock_auth_${input.jobId.replace(/-/g, '').slice(0, 12)}_${Date.now()}`;
    this.jobs.set(partnerRef, { jobId: input.jobId });
    this.logger.log({
      event: 'auth.started',
      partnerRef,
      jobId: input.jobId,
      listingId: input.listingId,
      orderId: input.orderId,
      mode: input.mode ?? 'SHIP_TO_AUTH',
    });
    return { partnerRef };
  }
}
