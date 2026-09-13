/* eslint-disable @typescript-eslint/no-explicit-any */
import { ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MockAuthenticationProvider } from '../providers/mock-authentication.provider';
import { MockPsp } from '../providers/mock-psp';
import { LuxuryAuthService } from './luxury-auth.service';

function configStub(): ConfigService {
  return {
    get: (k: string) =>
      ({ AUTH_FEE_KOBO: '1500000' } as Record<string, string>)[k],
  } as unknown as ConfigService;
}

describe('Phase 2.4 luxury auth', () => {
  const notifications = {
    log: jest.fn(),
    notify: jest.fn(async () => ({ created: [], skipped: [] })),
  };

  function buildService(prisma: any, psp = new MockPsp()) {
    return new LuxuryAuthService(
      prisma,
      configStub(),
      notifications as any,
      new MockAuthenticationProvider(),
      psp,
    );
  }

  it('pass path: IN_AUTHENTICATION → FUNDED + Authentic', async () => {
    const job: any = {
      id: 'job-1',
      listingId: 'listing-1',
      orderId: 'order-1',
      buyerId: 'buyer-1',
      sellerId: 'seller-1',
      status: 'IN_PROGRESS',
      feeKobo: 1_500_000,
      partnerRef: 'mock_auth_1',
      certificateId: null,
      evidenceJson: {},
      failReason: null,
      completedAt: null,
      order: { id: 'order-1', status: 'IN_AUTHENTICATION', totalKobo: 100_000 },
      listing: {
        id: 'listing-1',
        status: 'RESERVED',
        authRequired: true,
        authenticationStatus: 'PENDING',
      },
    };

    const prisma: any = {
      luxuryAuthJob: {
        findFirst: jest.fn().mockResolvedValue(job),
        update: jest.fn().mockImplementation(async ({ data }) => {
          Object.assign(job, data);
          return { ...job };
        }),
        findUniqueOrThrow: jest.fn().mockResolvedValue(job),
      },
      listing: {
        update: jest.fn().mockResolvedValue({}),
        findUniqueOrThrow: jest.fn().mockResolvedValue(job.listing),
      },
      order: {
        update: jest.fn().mockImplementation(async ({ data }) => {
          Object.assign(job.order, data);
          return job.order;
        }),
      },
      orderEvent: { create: jest.fn().mockResolvedValue({}) },
      $transaction: jest.fn(async (fn: any) => fn(prisma)),
    };

    const svc = buildService(prisma);
    await svc.handlePartnerComplete({
      jobId: 'job-1',
      partnerRef: 'mock_auth_1',
      passed: true,
    });

    expect(job.status).toBe('PASSED');
    expect(job.certificateId).toBeTruthy();
    expect(job.order.status).toBe('FUNDED');
    expect(prisma.listing.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ authenticationStatus: 'PASSED' }),
      }),
    );
  });

  it('fail path: refund idempotent', async () => {
    const psp = new MockPsp();
    const paymentRef = 'rw_order_pay_1';
    await psp.initiate({
      amountKobo: 100_000,
      currency: 'NGN',
      reference: paymentRef,
      email: 'b@x.com',
      idempotencyKey: 'pay-1',
    });
    psp.simulateWebhookSuccess(paymentRef);

    const job: any = {
      id: 'job-2',
      listingId: 'listing-2',
      orderId: 'order-2',
      buyerId: 'buyer-1',
      sellerId: 'seller-1',
      status: 'IN_PROGRESS',
      feeKobo: 1_500_000,
      partnerRef: 'mock_auth_2',
      order: {
        id: 'order-2',
        status: 'IN_AUTHENTICATION',
        totalKobo: 100_000,
      },
      listing: { id: 'listing-2', status: 'RESERVED' },
    };

    let refundCount = 0;
    const prisma: any = {
      luxuryAuthJob: {
        findFirst: jest.fn().mockResolvedValue(job),
        update: jest.fn().mockImplementation(async ({ data }) => {
          Object.assign(job, data);
          return job;
        }),
        findUniqueOrThrow: jest.fn().mockResolvedValue(job),
      },
      listing: {
        findUniqueOrThrow: jest.fn().mockResolvedValue(job.listing),
        update: jest.fn().mockResolvedValue({}),
      },
      listingEvent: { create: jest.fn().mockResolvedValue({}) },
      order: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'order-2',
          status: 'REFUND_REQUESTED',
          totalKobo: 100_000,
          payments: [
            { id: 'pay-1', reference: paymentRef, status: 'SUCCESS' },
          ],
        }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          id: 'order-2',
          status: 'REFUND_REQUESTED',
        }),
        update: jest.fn().mockImplementation(async ({ data }) => {
          Object.assign(job.order, data);
          return job.order;
        }),
      },
      orderEvent: { create: jest.fn().mockResolvedValue({}) },
      refund: {
        findUnique: jest.fn().mockImplementation(async () => {
          if (refundCount > 0) {
            return { id: 'refund-1', idempotencyKey: 'luxury-auth-refund:order-2' };
          }
          return null;
        }),
        create: jest.fn().mockImplementation(async () => {
          refundCount++;
          return { id: 'refund-1' };
        }),
      },
      payment: { update: jest.fn().mockResolvedValue({}) },
      $transaction: jest.fn(async (fn: any) => fn(prisma)),
    };

    const svc = buildService(prisma, psp);
    await svc.handlePartnerComplete({
      jobId: 'job-2',
      passed: false,
      failReason: 'counterfeit',
    });
    expect(job.status).toBe('FAILED');

    const first = await svc.issueFullRefundIdempotent('order-2', 'counterfeit');
    const second = await svc.issueFullRefundIdempotent('order-2', 'counterfeit');
    expect(first.already || first.refunded).toBe(true);
    expect(second.already).toBe(true);
  });

  it('unauthenticated luxury blocked from handover', () => {
    const svc = buildService({} as any);
    expect(() =>
      svc.assertCanHandOver(
        { authRequired: true, authenticationStatus: 'REQUIRED' },
        'FUNDED',
      ),
    ).toThrow(ConflictException);

    expect(() =>
      svc.assertCanHandOver(
        { authRequired: true, authenticationStatus: 'PENDING' },
        'IN_AUTHENTICATION',
      ),
    ).toThrow(ConflictException);

    expect(() =>
      svc.assertCanHandOver(
        { authRequired: false, authenticationStatus: 'OPTED_OUT' },
        'FUNDED',
      ),
    ).not.toThrow();

    expect(() =>
      svc.assertCanHandOver(
        { authRequired: true, authenticationStatus: 'PASSED' },
        'FUNDED',
      ),
    ).not.toThrow();
  });
});
