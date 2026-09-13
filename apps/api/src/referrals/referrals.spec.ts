/* eslint-disable @typescript-eslint/no-explicit-any */
import { ReferralsService } from './referrals.service';

describe('Phase 2.4 referrals', () => {
  it('e2e reward on first completed order', async () => {
    const attribution: any = {
      id: 'attr-1',
      referralCodeId: 'code-1',
      referrerId: 'referrer-1',
      referredUserId: 'buyer-1',
      riskFlagged: false,
      firstTxnAt: null,
      rewards: [],
    };

    const rewards: any[] = [];
    const prisma: any = {
      referralAttribution: {
        findUnique: jest.fn().mockResolvedValue(attribution),
        update: jest.fn().mockImplementation(async ({ data }) => {
          Object.assign(attribution, data);
          return attribution;
        }),
      },
      referralReward: {
        create: jest.fn().mockImplementation(async ({ data }) => {
          const row = { id: `rw-${rewards.length}`, ...data };
          rewards.push(row);
          return row;
        }),
        count: jest.fn().mockResolvedValue(0),
      },
      referralProgrammeConfig: {
        findUnique: jest.fn().mockResolvedValue({
          key: 'default',
          rewardType: 'FREE_BOOST',
          maxRewardsPerReferrerPerDay: 10,
          active: true,
        }),
      },
      $transaction: jest.fn(async (fn: any) => fn(prisma)),
    };

    const svc = new ReferralsService(prisma);
    await svc.onOrderCompleted('buyer-1', 'order-1');
    expect(attribution.firstTxnAt).toBeTruthy();
    expect(rewards).toHaveLength(2);
    expect(rewards.every((r) => r.status === 'GRANTED')).toBe(true);
    expect(rewards.every((r) => r.rewardType === 'FREE_BOOST')).toBe(true);

    // Second complete is no-op
    await svc.onOrderCompleted('buyer-1', 'order-2');
    expect(rewards).toHaveLength(2);
  });

  it('self-referral blocked', async () => {
    const prisma: any = {
      referralCode: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'code-1',
          userId: 'user-1',
          code: 'ABC123',
        }),
      },
      referralAttribution: {
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(async ({ data }) => ({
          id: 'attr-self',
          ...data,
        })),
        update: jest.fn(),
      },
      referralReward: {
        create: jest.fn().mockResolvedValue({}),
        count: jest.fn().mockResolvedValue(0),
      },
      referralProgrammeConfig: {
        findUnique: jest.fn().mockResolvedValue({
          key: 'default',
          active: true,
          maxRewardsPerReferrerPerDay: 10,
          rewardType: 'FREE_BOOST',
        }),
      },
    };

    const svc = new ReferralsService(prisma);
    const result = await svc.attribute('user-1', { code: 'ABC123' });
    expect(result.riskFlagged).toBe(true);
    expect(result.riskReason).toBe('self_referral');
    expect(prisma.referralReward.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'BLOCKED' }),
      }),
    );
  });

  it('device fingerprint reuse blocked', async () => {
    const prisma: any = {
      referralCode: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'code-2',
          userId: 'referrer-1',
          code: 'XYZ999',
        }),
      },
      referralAttribution: {
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn().mockResolvedValue({
          id: 'prior',
          deviceFingerprintHash: 'fp-same',
          riskFlagged: false,
        }),
        create: jest.fn().mockImplementation(async ({ data }) => ({
          id: 'attr-reuse',
          ...data,
        })),
      },
      referralReward: {
        create: jest.fn().mockResolvedValue({}),
        count: jest.fn().mockResolvedValue(0),
      },
      referralProgrammeConfig: {
        findUnique: jest.fn().mockResolvedValue({
          key: 'default',
          active: true,
          maxRewardsPerReferrerPerDay: 10,
          rewardType: 'FREE_BOOST',
        }),
      },
    };

    const svc = new ReferralsService(prisma);
    const result = await svc.attribute('buyer-2', {
      code: 'XYZ999',
      deviceFingerprintHash: 'fp-same',
    });
    expect(result.riskFlagged).toBe(true);
    expect(result.riskReason).toBe('device_fingerprint_reuse');
  });
});
