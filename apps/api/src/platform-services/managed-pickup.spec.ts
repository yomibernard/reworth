import { BadRequestException } from '@nestjs/common';
import { ManagedPickupService, watHourKey } from './managed-pickup.service';

describe('Managed pickup (Phase 3.1)', () => {
  it('WAT hour key is stable for Africa/Lagos', () => {
    // 2026-09-13 14:30 UTC = 15:30 WAT (UTC+1)
    const d = new Date('2026-09-13T14:30:00.000Z');
    expect(watHourKey(d)).toBe('2026-09-13T15');
  });

  it('rejects invalid range slotStart >= slotEnd', async () => {
    const prisma: any = {
      managedPickup: {
        findFirst: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
      },
    };
    const svc = new ManagedPickupService(prisma);
    await expect(
      svc.book('user-1', {
        slotStartAt: '2026-09-14T10:00:00+01:00',
        slotEndAt: '2026-09-14T09:00:00+01:00',
        addressLine: 'Lekki Phase 1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      svc.book('user-1', {
        slotStartAt: '2026-09-14T10:00:00+01:00',
        slotEndAt: '2026-09-14T10:00:00+01:00',
        addressLine: 'Lekki Phase 1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('accepts valid WAT slot when free', async () => {
    const prisma: any = {
      managedPickup: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(async ({ data }: any) => ({
          id: 'pickup-1',
          ...data,
        })),
      },
    };
    const svc = new ManagedPickupService(prisma);
    svc.clearMockBookings();
    const row = await svc.book('user-1', {
      slotStartAt: '2026-09-14T10:00:00+01:00',
      slotEndAt: '2026-09-14T11:00:00+01:00',
      addressLine: 'VGC Gate',
      city: 'Lagos',
    });
    expect(row.id).toBe('pickup-1');
    expect(prisma.managedPickup.create).toHaveBeenCalled();
  });
});
