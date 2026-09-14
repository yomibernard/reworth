/* eslint-disable @typescript-eslint/no-explicit-any */
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MockPsp } from '../providers/mock-psp';
import { BulkUploadService } from './bulk-upload.service';
import { ProAccountsService } from './pro-accounts.service';

function configStub(overrides: Record<string, string> = {}): ConfigService {
  const map: Record<string, string> = {
    PRO_SUBSCRIPTION_KOBO: '1500000',
    PRO_GRACE_DAYS: '7',
    BULK_UPLOAD_MAX_ROWS: '50',
    PRO_SUBSCRIPTION_SCHEDULER: 'false',
    ...overrides,
  };
  return { get: (k: string) => map[k] } as unknown as ConfigService;
}

describe('Phase 2.4 pro accounts', () => {
  const notifications = {
    log: jest.fn(),
    notify: jest.fn(async () => ({ created: [], skipped: [] })),
  };

  it('subscription pay / fail / grace / suspend', async () => {
    const account: any = {
      id: 'pro-1',
      userId: 'user-1',
      status: 'APPROVED',
      subscriptionRef: null,
      subscriptionStatus: 'none',
      mrrKobo: 0,
      currentPeriodEnd: null,
      graceUntil: null,
      warningCount: 0,
    };

    const prisma: any = {
      proAccount: {
        findUnique: jest.fn().mockImplementation(async () => ({ ...account })),
        update: jest.fn().mockImplementation(async ({ data }) => {
          if (data.warningCount?.increment) {
            account.warningCount += data.warningCount.increment;
            delete data.warningCount;
          }
          Object.assign(account, data);
          return { ...account };
        }),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({ email: 'pro@x.com' }),
      },
    };

    const psp = new MockPsp();
    const svc = new ProAccountsService(
      prisma,
      configStub(),
      notifications as any,
      psp,
    );

    await svc.subscribe('user-1');
    expect(account.status).toBe('ACTIVE');
    expect(account.subscriptionStatus).toBe('active');

    await svc.failSubscription('user-1');
    expect(account.status).toBe('GRACE');
    expect(account.graceUntil).toBeTruthy();

    await svc.failSubscription('user-1');
    expect(account.status).toBe('SUSPENDED');
  });

  it('CSV valid / partial / >50', async () => {
    const prisma: any = {
      category: {
        findFirst: jest.fn().mockImplementation(async ({ where }) => {
          if (where.slug === 'phones') {
            return { id: 'cat-phones', slug: 'phones' };
          }
          if (where.slug === 'luxury') {
            return { id: 'cat-lux', slug: 'luxury' };
          }
          return null;
        }),
      },
      listing: {
        create: jest.fn().mockResolvedValue({ id: 'listing-new' }),
      },
      bulkUploadJob: {
        create: jest.fn().mockImplementation(async ({ data }) => ({
          id: 'job-1',
          ...data,
        })),
        update: jest.fn().mockImplementation(async ({ data }) => ({
          id: 'job-1',
          ...data,
        })),
      },
    };

    const proAccounts = {
      assertActivePro: jest.fn().mockResolvedValue({
        id: 'pro-1',
        status: 'ACTIVE',
      }),
    };

    const bulk = new BulkUploadService(
      prisma,
      configStub(),
      proAccounts as any,
    );

    const valid = await bulk.upload('user-1', {
      csv: `title,priceNaira,condition,community,categorySlug
iPhone,500000,GOOD,Lekki,phones
Bag,2000000,LIKE_NEW,VI,luxury`,
    });
    expect(valid.successCount).toBe(2);
    expect(prisma.listing.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          authRequired: true,
          authenticationStatus: 'REQUIRED',
        }),
      }),
    );

    const partial = await bulk.upload('user-1', {
      csv: `title,priceNaira,condition,community,categorySlug
Ok Item,10000,GOOD,Lekki,phones
Bad,,GOOD,Lekki,phones
Unknown,100,GOOD,Lekki,nope`,
    });
    expect(partial.successCount).toBe(1);
    expect(partial.errorCount).toBeGreaterThan(0);

    expect(() =>
      bulk.parseCsv(
        ['title,priceNaira,condition,community,categorySlug']
          .concat(
            Array.from({ length: 51 }, (_, i) => `Item${i},1000,GOOD,Lekki,phones`),
          )
          .join('\n'),
      ),
    ).toThrow(BadRequestException);

    proAccounts.assertActivePro.mockRejectedValue(
      new ForbiddenException('Pro account suspended'),
    );
    await expect(
      bulk.upload('user-1', {
        csv: 'title,priceNaira,condition,community,categorySlug\nA,1,GOOD,Lekki,phones',
      }),
    ).rejects.toThrow(ForbiddenException);
  });
});
