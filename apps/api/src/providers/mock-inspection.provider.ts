import { Injectable, Logger } from '@nestjs/common';
import type {
  InspectionProvider,
  ScheduleInspectionInput,
  ScheduleInspectionResult,
} from './inspection.provider';

@Injectable()
export class MockInspectionProvider implements InspectionProvider {
  readonly name = 'mock-inspection';
  private readonly logger = new Logger(MockInspectionProvider.name);
  private readonly jobs = new Map<string, { inspectionId: string }>();

  async schedule(
    input: ScheduleInspectionInput,
  ): Promise<ScheduleInspectionResult> {
    const partnerRef = `mock_insp_${input.inspectionId.replace(/-/g, '').slice(0, 12)}_${Date.now()}`;
    const scheduledAt =
      input.scheduledAt ?? new Date(Date.now() + 24 * 60 * 60 * 1000);
    const slotLabel = input.slotLabel ?? 'next-available';
    this.jobs.set(partnerRef, { inspectionId: input.inspectionId });
    this.logger.log({
      event: 'inspection.scheduled',
      partnerRef,
      inspectionId: input.inspectionId,
      listingId: input.listingId,
      slotLabel,
    });
    return { partnerRef, scheduledAt, slotLabel };
  }
}
