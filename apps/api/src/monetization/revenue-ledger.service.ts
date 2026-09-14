import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import {
  Prisma,
  RevenueLineStatus,
  RevenueStream,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FeeConfigService } from './fee-config.service';

export type RecordRevenueInput = {
  stream: RevenueStream;
  grossKobo: number;
  netKobo: number;
  orderId?: string;
  listingId?: string;
  sellerId?: string;
  city?: string;
  categoryId?: string;
  pspReference?: string | null;
  deferredPsp?: boolean;
  feeConfigVersionId?: string;
  referenceType: string;
  referenceId: string;
  meta?: Record<string, unknown>;
  status?: RevenueLineStatus;
};

@Injectable()
export class RevenueLedgerService {
  private readonly logger = new Logger(RevenueLedgerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly fees: FeeConfigService,
  ) {}

  /**
   * Exactly one RevenueLine per (stream, referenceType, referenceId).
   * Idempotent upsert — never double-charge the ledger.
   */
  async record(input: RecordRevenueInput) {
    if (input.grossKobo < 0 || input.netKobo < 0) {
      throw new BadRequestException('Revenue amounts must be non-negative');
    }
    if (input.netKobo > input.grossKobo) {
      throw new BadRequestException('netKobo cannot exceed grossKobo');
    }
    if (!input.deferredPsp && !input.pspReference) {
      throw new BadRequestException(
        'pspReference required unless deferredPsp=true',
      );
    }

    const active = await this.fees.getActive();
    const feeConfigVersionId =
      input.feeConfigVersionId ?? active.id;

    try {
      return await this.prisma.revenueLine.create({
        data: {
          stream: input.stream,
          grossKobo: input.grossKobo,
          netKobo: input.netKobo,
          status: input.status ?? 'SETTLED',
          orderId: input.orderId,
          listingId: input.listingId,
          sellerId: input.sellerId,
          city: input.city ?? 'Lagos',
          categoryId: input.categoryId,
          pspReference: input.pspReference ?? null,
          deferredPsp: input.deferredPsp ?? false,
          feeConfigVersionId,
          referenceType: input.referenceType,
          referenceId: input.referenceId,
          meta: (input.meta ?? {}) as Prisma.InputJsonValue,
          settledAt:
            (input.status ?? 'SETTLED') === 'SETTLED' ? new Date() : null,
        },
      });
    } catch (err) {
      if (
        err &&
        typeof err === 'object' &&
        'code' in err &&
        (err as { code: string }).code === 'P2002'
      ) {
        const existing = await this.prisma.revenueLine.findFirst({
          where: {
            stream: input.stream,
            referenceType: input.referenceType,
            referenceId: input.referenceId,
          },
        });
        this.logger.debug(
          `RevenueLine idempotent hit ${input.stream}:${input.referenceId}`,
        );
        return existing!;
      }
      throw err;
    }
  }

  async markRefunded(stream: RevenueStream, referenceType: string, referenceId: string) {
    const row = await this.prisma.revenueLine.findFirst({
      where: { stream, referenceType, referenceId },
    });
    if (!row) return null;
    return this.prisma.revenueLine.update({
      where: { id: row.id },
      data: { status: 'REFUNDED', refundedAt: new Date() },
    });
  }
}
