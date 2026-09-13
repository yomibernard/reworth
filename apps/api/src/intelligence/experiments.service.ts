import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export const REC_HOME_EXPERIMENT_KEY = 'rec_home_v2';

/** Stable bucket 0–99 from hash(userId:experimentKey). */
export function experimentBucket(userId: string, experimentKey: string): number {
  const hex = createHash('sha256')
    .update(`${userId}:${experimentKey}`)
    .digest('hex')
    .slice(0, 8);
  return parseInt(hex, 16) % 100;
}

@Injectable()
export class ExperimentsService implements OnModuleInit {
  private readonly logger = new Logger(ExperimentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    if (process.env.NODE_ENV === 'test') return;
    try {
      await this.ensureRecHomeExperiment();
    } catch (err) {
      this.logger.warn(
        `Experiment seed skipped: ${(err as Error).message}`,
      );
    }
  }

  async ensureRecHomeExperiment() {
    await this.prisma.experiment.upsert({
      where: { key: REC_HOME_EXPERIMENT_KEY },
      create: {
        id: randomUUID(),
        key: REC_HOME_EXPERIMENT_KEY,
        name: 'Home recommendations v2',
        description:
          'control = popularity v1; weighted_v2 = WeightedRecProvider',
        variants: ['control', 'weighted_v2'] as unknown as Prisma.InputJsonValue,
        trafficPct: 100,
        active: true,
      },
      update: {
        active: true,
        variants: ['control', 'weighted_v2'] as unknown as Prisma.InputJsonValue,
      },
    });
  }

  /**
   * Assign (and persist) a variant. Bucket < 50 → control, else weighted_v2
   * when trafficPct=100 and two variants.
   */
  async assignVariant(
    userId: string,
    experimentKey = REC_HOME_EXPERIMENT_KEY,
  ): Promise<string> {
    const experiment = await this.prisma.experiment.findUnique({
      where: { key: experimentKey },
    });
    if (!experiment || !experiment.active) return 'control';

    const existing = await this.prisma.experimentAssignment.findUnique({
      where: {
        experimentId_userId: {
          experimentId: experiment.id,
          userId,
        },
      },
    });
    if (existing) return existing.variant;

    const variants = Array.isArray(experiment.variants)
      ? (experiment.variants as string[])
      : ['control', 'weighted_v2'];
    const bucket = experimentBucket(userId, experimentKey);
    if (bucket >= experiment.trafficPct) {
      const variant = 'control';
      await this.prisma.experimentAssignment.create({
        data: {
          id: randomUUID(),
          experimentId: experiment.id,
          userId,
          variant,
        },
      });
      return variant;
    }

    // Split traffic evenly across variants (stable by bucket)
    const idx = bucket % variants.length;
    const variant = variants[idx] ?? 'control';
    await this.prisma.experimentAssignment.create({
      data: {
        id: randomUUID(),
        experimentId: experiment.id,
        userId,
        variant,
      },
    });
    return variant;
  }

  async recordMetric(input: {
    userId: string;
    experimentKey?: string;
    event: string;
    listingId?: string;
    meta?: Record<string, unknown>;
  }): Promise<void> {
    const key = input.experimentKey ?? REC_HOME_EXPERIMENT_KEY;
    const experiment = await this.prisma.experiment.findUnique({
      where: { key },
    });
    if (!experiment) return;

    const variant = await this.assignVariant(input.userId, key);
    await this.prisma.experimentMetric.create({
      data: {
        id: randomUUID(),
        experimentId: experiment.id,
        userId: input.userId,
        variant,
        event: input.event,
        listingId: input.listingId,
        meta: input.meta
          ? (input.meta as Prisma.InputJsonValue)
          : undefined,
      },
    });
  }
}
