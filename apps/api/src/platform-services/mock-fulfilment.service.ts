import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type {
  FulfilmentService,
  FulfilmentTransitionResult,
  SchedulePickupInput,
} from './fulfilment.service';

@Injectable()
export class MockFulfilmentService implements FulfilmentService {
  readonly name = 'mock-fulfilment';
  private readonly logger = new Logger(MockFulfilmentService.name);

  constructor(private readonly prisma: PrismaService) {}

  async schedulePickup(
    input: SchedulePickupInput,
  ): Promise<FulfilmentTransitionResult> {
    const row = await this.prisma.instantBuyFulfilment.update({
      where: { id: input.fulfilmentId },
      data: { status: 'PENDING_PICKUP' },
    });
    this.logger.debug({ schedulePickup: input });
    return {
      fulfilmentId: row.id,
      status: row.status,
      at: new Date(),
    };
  }

  async markPickedUp(fulfilmentId: string): Promise<FulfilmentTransitionResult> {
    const now = new Date();
    const row = await this.prisma.instantBuyFulfilment.update({
      where: { id: fulfilmentId },
      data: { status: 'PICKED_UP', pickedUpAt: now },
    });
    return { fulfilmentId: row.id, status: row.status, at: now };
  }

  async markDelivered(
    fulfilmentId: string,
  ): Promise<FulfilmentTransitionResult> {
    const now = new Date();
    const row = await this.prisma.instantBuyFulfilment.update({
      where: { id: fulfilmentId },
      data: { status: 'DELIVERED', deliveredAt: now },
    });
    return { fulfilmentId: row.id, status: row.status, at: now };
  }

  async checkSla(now = new Date()): Promise<{ breached: string[] }> {
    const due = await this.prisma.instantBuyFulfilment.findMany({
      where: {
        status: { in: ['PENDING_PICKUP', 'PICKED_UP', 'IN_TRANSIT'] },
        slaDeadlineAt: { lte: now },
      },
      select: { id: true },
    });
    return { breached: due.map((d) => d.id) };
  }
}
