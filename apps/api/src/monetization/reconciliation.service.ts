import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Nightly reconciliation: RevenueLines (settled, non-deferred) vs Payment SUCCESS refs.
 * Injected mismatches (meta.forceMismatch) also raise FinanceAlert.
 */
@Injectable()
export class ReconciliationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ReconciliationService.name);
  private timer?: ReturnType<typeof setInterval>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    if (
      process.env.NODE_ENV === 'test' ||
      this.config.get('RECONCILIATION_SCHEDULER') === 'false'
    ) {
      return;
    }
    // Every 6h in non-prod; production would be nightly cron
    const ms = Number(this.config.get('RECONCILIATION_INTERVAL_MS') ?? 6 * 3600_000);
    this.timer = setInterval(() => {
      void this.run().catch((e) =>
        this.logger.warn(`reconciliation: ${(e as Error).message}`),
      );
    }, ms);
    if (typeof this.timer.unref === 'function') this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async run(opts?: { injectMismatch?: boolean }) {
    const started = await this.prisma.reconciliationRun.create({
      data: {},
    });

    const lines = await this.prisma.revenueLine.findMany({
      where: {
        status: 'SETTLED',
        deferredPsp: false,
        pspReference: { not: null },
        createdAt: { gte: new Date(Date.now() - 40 * 86_400_000) },
      },
      take: 5000,
    });

    const payments = await this.prisma.payment.findMany({
      where: {
        status: { in: ['SUCCESS', 'RELEASED', 'REFUNDED', 'PARTIALLY_REFUNDED'] },
        createdAt: { gte: new Date(Date.now() - 40 * 86_400_000) },
      },
      select: { reference: true, amountKobo: true, status: true },
    });
    const byRef = new Map(payments.map((p) => [p.reference, p]));

    let matched = 0;
    const mismatches: Array<Record<string, unknown>> = [];

    for (const line of lines) {
      const ref = line.pspReference!;
      // Boost/featured/subscription refs are not Order payments — skip order PSP set
      if (
        line.stream === 'BOOST' ||
        line.stream === 'FEATURED' ||
        line.stream === 'SUBSCRIPTION' ||
        line.stream === 'PROMOTED'
      ) {
        matched++;
        continue;
      }
      const pay = byRef.get(ref);
      if (!pay) {
        mismatches.push({
          kind: 'missing_psp',
          revenueLineId: line.id,
          pspReference: ref,
          stream: line.stream,
        });
        continue;
      }
      matched++;
    }

    if (opts?.injectMismatch) {
      mismatches.push({
        kind: 'injected',
        message: 'Synthetic mismatch for Phase 3.3 acceptance',
      });
    }

    // Force-mismatch lines (tests / ops)
    const forced = await this.prisma.revenueLine.findMany({
      where: {
        meta: { path: ['forceMismatch'], equals: true },
        status: 'SETTLED',
      },
      take: 50,
    });
    for (const f of forced) {
      mismatches.push({
        kind: 'forced',
        revenueLineId: f.id,
        pspReference: f.pspReference,
      });
    }

    for (const m of mismatches) {
      await this.prisma.financeAlert.create({
        data: {
          kind: 'RECONCILIATION_MISMATCH',
          severity: 'warning',
          message: `Revenue/PSP mismatch: ${String(m.kind)}`,
          payload: m as Prisma.InputJsonValue,
        },
      });
    }

    const finished = await this.prisma.reconciliationRun.update({
      where: { id: started.id },
      data: {
        finishedAt: new Date(),
        matchedCount: matched,
        mismatchCount: mismatches.length,
        details: { mismatches } as Prisma.InputJsonValue,
      },
    });

    this.logger.log({
      event: 'reconciliation.finished',
      matched,
      mismatches: mismatches.length,
    });
    return finished;
  }

  async latest() {
    return this.prisma.reconciliationRun.findFirst({
      orderBy: { startedAt: 'desc' },
    });
  }

  async listAlerts(unresolvedOnly = true) {
    return this.prisma.financeAlert.findMany({
      where: unresolvedOnly ? { resolvedAt: null } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async resolveAlert(id: string, actorId: string) {
    return this.prisma.financeAlert.update({
      where: { id },
      data: { resolvedAt: new Date(), acknowledgedById: actorId },
    });
  }
}
