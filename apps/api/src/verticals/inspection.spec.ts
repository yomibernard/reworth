/* eslint-disable @typescript-eslint/no-explicit-any */
import { ConfigService } from '@nestjs/config';
import { MockPsp } from '../providers/mock-psp';
import { MockInspectionProvider } from '../providers/mock-inspection.provider';
import { VehicleInspectionsService } from './vehicle-inspections.service';
import { inspectedBadgeFromLatest } from './inspected-badge';

function configStub(overrides: Record<string, string> = {}): ConfigService {
  const map: Record<string, string> = {
    INSPECTION_FEE_KOBO: '2500000',
    INSPECTION_VALIDITY_DAYS: '30',
    INSPECTION_EXPIRY_SCHEDULER: 'false',
    ...overrides,
  };
  return { get: (k: string) => map[k] } as unknown as ConfigService;
}

describe('Phase 2.4 vehicle inspections', () => {
  const notifications = {
    log: jest.fn(),
    notify: jest.fn(async () => ({ created: [], skipped: [] })),
  };

  it('schedule → report → expiry dims badge', async () => {
    const inspState: any = {
      id: 'insp-1',
      listingId: 'listing-1',
      requesterId: 'user-1',
      status: 'REQUESTED',
      feeKobo: 2_500_000,
      paymentRef: 'insp_ref_1',
      scheduledAt: null,
      slotLabel: null,
      partnerRef: null,
      conditionScore: null,
      verifiedMileage: null,
      accidentNotes: null,
      tyreBatteryNotes: null,
      registrationOk: null,
      reportPhotos: [],
      reportChecklist: {},
      completedAt: null,
      expiresAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const prisma: any = {
      listing: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'listing-1',
          sellerId: 'seller-1',
          vehicle: { make: 'Toyota' },
        }),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({ email: 'a@b.com' }),
      },
      vehicleInspection: {
        create: jest.fn().mockImplementation(async ({ data }) => {
          Object.assign(inspState, data, { id: 'insp-1' });
          return { ...inspState };
        }),
        findUnique: jest.fn().mockImplementation(async () => ({ ...inspState })),
        findFirst: jest.fn().mockImplementation(async () => ({ ...inspState })),
        findMany: jest.fn().mockImplementation(async ({ where }) => {
          if (where?.status === 'COMPLETED') {
            return inspState.status === 'COMPLETED' &&
              inspState.expiresAt &&
              inspState.expiresAt <= (where.expiresAt?.lte ?? new Date())
              ? [{ id: inspState.id }]
              : [];
          }
          return [];
        }),
        update: jest.fn().mockImplementation(async ({ data }) => {
          Object.assign(inspState, data);
          return { ...inspState };
        }),
      },
    };

    const psp = new MockPsp();
    const provider = new MockInspectionProvider();
    const ledger = { record: jest.fn().mockResolvedValue({}) };
    const fees = {
      getActive: jest.fn().mockResolvedValue({
        id: 'fee-1',
        version: 1,
        rates: { inspectionMarginPct: 0.1 },
      }),
    };
    const svc = new VehicleInspectionsService(
      prisma,
      configStub(),
      notifications as any,
      ledger as any,
      fees as any,
      provider,
      psp,
    );

    // Request creates PAYMENT_PENDING + initiates PSP
    const requested = await svc.request('listing-1', 'user-1', {
      slotLabel: 'tomorrow-am',
    });
    expect(requested.status).toBe('PAYMENT_PENDING');
    expect(inspState.paymentRef).toBeTruthy();

    await svc.pay('insp-1', 'user-1');
    expect(inspState.status).toBe('REQUESTED');

    await svc.schedule('insp-1', 'user-1', { slotLabel: 'tomorrow-am' });
    expect(inspState.status).toBe('SCHEDULED');
    expect(inspState.partnerRef).toBeTruthy();

    await svc.handleWebhook({
      partnerRef: inspState.partnerRef,
      inspectionId: 'insp-1',
      conditionScore: 82,
      verifiedMileage: 45000,
      registrationOk: true,
      reportChecklist: { brakes: 'ok' },
      reportPhotos: ['photo1'],
    });
    expect(inspState.status).toBe('COMPLETED');
    expect(inspState.expiresAt).toBeTruthy();
    expect(inspectedBadgeFromLatest(inspState)).toBe('Inspected ✓');

    // Expire badge
    inspState.expiresAt = new Date(Date.now() - 1000);
    prisma.vehicleInspection.findMany = jest
      .fn()
      .mockResolvedValue([{ id: 'insp-1' }]);
    await svc.expireDueBadges(new Date());
    expect(inspState.status).toBe('EXPIRED');
    expect(inspectedBadgeFromLatest(inspState)).toMatch(/^Inspected /);
    expect(inspectedBadgeFromLatest(inspState)).not.toBe('Inspected ✓');
  });
});
