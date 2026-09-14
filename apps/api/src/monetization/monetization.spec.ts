/* eslint-disable @typescript-eslint/no-explicit-any */
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MockPsp } from '../providers/mock-psp';
import {
  DEFAULT_FEE_RATES,
  computeDeliveryMarginKobo,
  computePartnerMarginKobo,
  computeProtectionFeeKoboFromRates,
} from './fee-rates';
import { FinanceDashboardService } from './finance-dashboard.service';
import { ReconciliationService } from './reconciliation.service';
import { RevenueLedgerService } from './revenue-ledger.service';
import { SellerPromotionsService } from './seller-promotions.service';
import { SellerSubscriptionService } from './seller-subscription.service';

describe('Phase 3.3 fee math', () => {
  it('protection fee applies pct with cap', () => {
    const rates = DEFAULT_FEE_RATES;
    expect(computeProtectionFeeKoboFromRates(1_000_000, rates)).toBe(25_000);
    expect(computeProtectionFeeKoboFromRates(100_000_000, rates)).toBe(
      rates.protectionFeeCapKobo,
    );
  });

  it('delivery margin is floor(fee * pct)', () => {
    expect(computeDeliveryMarginKobo(10_000, DEFAULT_FEE_RATES)).toBe(1_500);
    expect(computeDeliveryMarginKobo(0, DEFAULT_FEE_RATES)).toBe(0);
  });

  it('partner margin: gross = cost + floor(cost * pct)', () => {
    const { grossKobo, netKobo } = computePartnerMarginKobo(1_000_000, 0.1);
    expect(netKobo).toBe(100_000);
    expect(grossKobo).toBe(1_100_000);
  });

  it('property: protection fee never exceeds cap; non-negative', () => {
    const amounts = [0, 1, 999, 40_000_00, 50_000_00, 200_000_00];
    for (const a of amounts) {
      const fee = computeProtectionFeeKoboFromRates(a, DEFAULT_FEE_RATES);
      expect(fee).toBeGreaterThanOrEqual(0);
      expect(fee).toBeLessThanOrEqual(DEFAULT_FEE_RATES.protectionFeeCapKobo);
      expect(fee).toBeLessThanOrEqual(
        Math.ceil(a * DEFAULT_FEE_RATES.protectionFeePct) || 0,
      );
    }
  });
});

describe('Phase 3.3 RevenueLedger', () => {
  it('requires pspReference unless deferred', async () => {
    const prisma: any = { revenueLine: { create: jest.fn() } };
    const fees: any = {
      getActive: jest.fn().mockResolvedValue({
        id: 'fee-1',
        version: 1,
        rates: DEFAULT_FEE_RATES,
      }),
    };
    const ledger = new RevenueLedgerService(prisma, fees);
    await expect(
      ledger.record({
        stream: 'BOOST',
        grossKobo: 100,
        netKobo: 100,
        referenceType: 'Promotion',
        referenceId: 'p1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('records with deferredPsp and is idempotent on P2002', async () => {
    const existing = { id: 'rl-1', stream: 'BOOST' };
    const prisma: any = {
      revenueLine: {
        create: jest
          .fn()
          .mockRejectedValueOnce({ code: 'P2002' })
          .mockResolvedValueOnce({ id: 'rl-2' }),
        findFirst: jest.fn().mockResolvedValue(existing),
      },
    };
    const fees: any = {
      getActive: jest.fn().mockResolvedValue({
        id: 'fee-1',
        version: 1,
        rates: DEFAULT_FEE_RATES,
      }),
    };
    const ledger = new RevenueLedgerService(prisma, fees);
    const hit = await ledger.record({
      stream: 'CONSIGNMENT_FEE',
      grossKobo: 500,
      netKobo: 500,
      deferredPsp: true,
      referenceType: 'Consignment',
      referenceId: 'c1:fee',
    });
    expect(hit).toEqual(existing);
  });
});

describe('Phase 3.3 boost + subscription', () => {
  function configStub(): ConfigService {
    return {
      get: (k: string) =>
        k.includes('SCHEDULER') || k.includes('BOOST') ? 'false' : undefined,
    } as unknown as ConfigService;
  }

  it('boost purchase is idempotent and writes RevenueLine', async () => {
    const promo = {
      id: 'promo-1',
      listingId: 'list-1',
      kind: 'BOOST',
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 86400000),
      feeKobo: 150_000,
      paymentStatus: 'SUCCESS',
      pspReference: 'boost_ref',
      idempotencyKey: 'idem-1',
    };
    const prisma: any = {
      promotion: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(promo),
        create: jest.fn().mockResolvedValue(promo),
      },
      listing: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'list-1',
          sellerId: 'seller-1',
          status: 'LIVE',
          city: 'Lagos',
          categoryId: null,
        }),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({ email: 's@x.com' }),
      },
    };
    const fees: any = {
      getActive: jest.fn().mockResolvedValue({
        id: 'fee-v1',
        version: 1,
        rates: DEFAULT_FEE_RATES,
      }),
    };
    const ledger = {
      record: jest.fn().mockResolvedValue({ id: 'rl' }),
    };
    const psp = new MockPsp();
    const svc = new SellerPromotionsService(
      prisma,
      fees,
      ledger as any,
      configStub(),
      psp,
    );

    const first = await svc.purchaseBoost('seller-1', 'list-1', 24, 'idem-1');
    expect(first.kind).toBe('BOOST');
    expect(ledger.record).toHaveBeenCalledWith(
      expect.objectContaining({ stream: 'BOOST', feeConfigVersionId: 'fee-v1' }),
    );

    const second = await svc.purchaseBoost('seller-1', 'list-1', 24, 'idem-1');
    expect(second.id).toBe('promo-1');
    expect(prisma.promotion.create).toHaveBeenCalledTimes(1);
  });

  it('price versioning: quote pins feeConfigVersionId', async () => {
    const fees: any = {
      getActive: jest.fn().mockResolvedValue({
        id: 'fee-old',
        version: 1,
        rates: DEFAULT_FEE_RATES,
      }),
    };
    const svc = new SellerPromotionsService(
      {} as any,
      fees,
      {} as any,
      configStub(),
      new MockPsp(),
    );
    const q = await svc.quoteBoost(24);
    expect(q.feeConfigVersionId).toBe('fee-old');
    expect(q.priceKobo).toBe(DEFAULT_FEE_RATES.boost.priceByHoursKobo['24']);
  });

  it('subscription upgrade / cancel / fail-grace / suspend', async () => {
    const sub: any = {
      id: 'sub-1',
      userId: 'u1',
      tier: 'STARTER',
      status: 'NONE',
      priceKobo: 0,
      graceUntil: null,
      cancelAtPeriodEnd: false,
      currentPeriodEnd: null,
    };
    const prisma: any = {
      sellerSubscription: {
        findUnique: jest.fn().mockImplementation(async () => ({ ...sub })),
        create: jest.fn().mockImplementation(async ({ data }) => {
          Object.assign(sub, data);
          return { ...sub };
        }),
        update: jest.fn().mockImplementation(async ({ data }) => {
          Object.assign(sub, data);
          return { ...sub };
        }),
        findMany: jest.fn().mockImplementation(async ({ where }) => {
          if (where?.status === 'PAST_DUE') {
            return sub.status === 'PAST_DUE' &&
              sub.graceUntil &&
              sub.graceUntil.getTime() <= Date.now()
              ? [{ ...sub }]
              : [];
          }
          return [];
        }),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({ email: 'u@x.com' }),
      },
    };
    const fees: any = {
      getActive: jest.fn().mockResolvedValue({
        id: 'fee-1',
        version: 1,
        rates: DEFAULT_FEE_RATES,
      }),
    };
    const ledger = { record: jest.fn().mockResolvedValue({}) };
    const svc = new SellerSubscriptionService(
      prisma,
      fees,
      ledger as any,
      configStub(),
      new MockPsp(),
    );

    await svc.upgradeToPlus('u1', 'plus-idem');
    expect(sub.tier).toBe('PLUS');
    expect(sub.status).toBe('ACTIVE');
    expect(ledger.record).toHaveBeenCalledWith(
      expect.objectContaining({ stream: 'SUBSCRIPTION' }),
    );

    await svc.cancel('u1');
    expect(sub.cancelAtPeriodEnd).toBe(true);

    await svc.simulatePaymentFailure('u1');
    expect(sub.status).toBe('PAST_DUE');
    expect(sub.graceUntil).toBeTruthy();

    sub.graceUntil = new Date(Date.now() - 1000);
    await svc.tick();
    expect(sub.status).toBe('SUSPENDED');
    expect(sub.tier).toBe('STARTER');
  });
});

describe('Phase 3.3 reconciliation + finance dashboard', () => {
  it('injected mismatch creates Finance alert', async () => {
    const alerts: any[] = [];
    const prisma: any = {
      reconciliationRun: {
        create: jest.fn().mockResolvedValue({ id: 'run-1' }),
        update: jest.fn().mockImplementation(async ({ data }) => ({
          id: 'run-1',
          ...data,
        })),
      },
      revenueLine: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      payment: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      financeAlert: {
        create: jest.fn().mockImplementation(async ({ data }) => {
          const row = { id: `a-${alerts.length}`, ...data };
          alerts.push(row);
          return row;
        }),
      },
    };
    const svc = new ReconciliationService(prisma, {
      get: () => 'false',
    } as unknown as ConfigService);
    const run = await svc.run({ injectMismatch: true });
    expect(run.mismatchCount).toBe(1);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].kind).toBe('RECONCILIATION_MISMATCH');
  });

  it('finance summary take rate and MRR vs fixtures', async () => {
    const prisma: any = {
      revenueLine: {
        findMany: jest.fn().mockResolvedValue([
          {
            stream: 'PROTECTION_FEE',
            grossKobo: 100_000,
            netKobo: 100_000,
            status: 'SETTLED',
            city: 'Lagos',
          },
          {
            stream: 'BOOST',
            grossKobo: 150_000,
            netKobo: 150_000,
            status: 'SETTLED',
            city: 'Lagos',
          },
        ]),
      },
      order: {
        findMany: jest.fn().mockResolvedValue([
          { totalKobo: 2_000_000, amountKobo: 2_000_000 },
        ]),
      },
      listing: { count: jest.fn().mockResolvedValue(10) },
      promotion: {
        groupBy: jest.fn().mockResolvedValue([{ listingId: 'a' }, { listingId: 'b' }]),
      },
      sellerSubscription: {
        count: jest
          .fn()
          .mockResolvedValueOnce(2) // active
          .mockResolvedValueOnce(0) // cancelled
          .mockResolvedValueOnce(1), // new
        findFirst: jest.fn().mockResolvedValue({ priceKobo: 499_900 }),
      },
    };
    const dash = new FinanceDashboardService(prisma);
    const s = await dash.summary(30);
    expect(s.gmvKobo).toBe(2_000_000);
    expect(s.netTotalKobo).toBe(250_000);
    expect(s.takeRate).toBeCloseTo(250_000 / 2_000_000);
    expect(s.mrr.activeKobo).toBe(2 * 499_900);
    expect(s.boostAttachRate).toBeCloseTo(0.2);
    expect(s.byCity.Lagos.netKobo).toBe(250_000);
  });
});
