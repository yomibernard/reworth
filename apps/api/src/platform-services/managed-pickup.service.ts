import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  Optional,
} from '@nestjs/common';
import { normalizeCity } from '../intelligence/city-scope';
import { PrismaService } from '../prisma/prisma.service';
import { RoomScanService } from '../room-scan/room-scan.service';

const WAT = 'Africa/Lagos';

/** Format hour key in WAT for double-book checks. */
export function watHourKey(d: Date): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: WAT,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}`;
}

@Injectable()
export class ManagedPickupService {
  private readonly logger = new Logger(ManagedPickupService.name);
  /** In-memory mock occupancy by WAT hour key. */
  private readonly bookedHours = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly roomScans?: RoomScanService,
  ) {}

  async book(
    userId: string,
    input: {
      slotStartAt: string | Date;
      slotEndAt: string | Date;
      addressLine: string;
      city?: string;
      photoAddon?: boolean;
      photoKeys?: string[];
    },
  ) {
    const slotStartAt = new Date(input.slotStartAt);
    const slotEndAt = new Date(input.slotEndAt);
    if (!(slotStartAt < slotEndAt)) {
      throw new BadRequestException('slotStartAt must be before slotEndAt');
    }
    if (Number.isNaN(slotStartAt.getTime()) || Number.isNaN(slotEndAt.getTime())) {
      throw new BadRequestException('Invalid slot datetime');
    }

    const hourKey = watHourKey(slotStartAt);
    if (this.bookedHours.has(hourKey)) {
      throw new ConflictException(
        `Slot hour already booked (WAT ${hourKey}). Choose another hour.`,
      );
    }

    // Also check DB for same hour overlap (mock double-book guard)
    const hourStart = new Date(slotStartAt);
    hourStart.setUTCMinutes(0, 0, 0);
    const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);
    const clash = await this.prisma.managedPickup.findFirst({
      where: {
        status: { in: ['BOOKED', 'ASSIGNED'] },
        slotStartAt: { gte: hourStart, lt: hourEnd },
      },
    });
    if (clash) {
      throw new ConflictException('Slot hour already booked');
    }

    let roomScanId: string | null = null;
    const photoKeys = input.photoKeys ?? [];
    if (input.photoAddon && photoKeys.length > 0 && this.roomScans) {
      const scan = await this.roomScans.create(
        userId,
        photoKeys,
        input.city,
      );
      roomScanId = scan.id;
    }

    const row = await this.prisma.managedPickup.create({
      data: {
        userId,
        city: normalizeCity(input.city),
        status: 'BOOKED',
        slotStartAt,
        slotEndAt,
        addressLine: input.addressLine,
        photoAddon: Boolean(input.photoAddon),
        photoKeys,
        roomScanId,
        partnerRef: `mock-pickup-${hourKey}`,
      },
    });

    this.bookedHours.add(hourKey);
    this.logger.debug({ booked: row.id, watHour: hourKey });
    return row;
  }

  async mine(userId: string) {
    return this.prisma.managedPickup.findMany({
      where: { userId },
      orderBy: { slotStartAt: 'desc' },
    });
  }

  /** Test helper — clear in-memory hour locks. */
  clearMockBookings(): void {
    this.bookedHours.clear();
  }
}
