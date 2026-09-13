import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationCategory } from '../notifications/notification-categories';
import {
  formatSavedSearchAlertBody,
} from './saved-search-alerts.service';
import {
  matchesSavedFilters,
  savedSearchLabel,
} from './saved-search-matcher';
import { DEFAULT_CITY } from './city-scope';

/** Next 09:00 Africa/Lagos (WAT = UTC+1, no DST). */
export function nextNineAmWat(from = new Date()): Date {
  const watOffsetMs = 60 * 60 * 1000;
  const watNow = new Date(from.getTime() + watOffsetMs);
  const y = watNow.getUTCFullYear();
  const m = watNow.getUTCMonth();
  const d = watNow.getUTCDate();
  let targetUtc = Date.UTC(y, m, d, 8, 0, 0); // 09:00 WAT = 08:00 UTC
  if (targetUtc <= from.getTime()) {
    targetUtc += 24 * 60 * 60 * 1000;
  }
  return new Date(targetUtc);
}

@Injectable()
export class SavedSearchDigestScheduler
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(SavedSearchDigestScheduler.name);
  private timer?: ReturnType<typeof setTimeout>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    const disabled =
      process.env.NODE_ENV === 'test' ||
      this.config.get<string>('SAVED_SEARCH_DIGEST_SCHEDULER') === 'false';
    if (disabled) return;
    this.scheduleNext();
  }

  onModuleDestroy() {
    if (this.timer) clearTimeout(this.timer);
  }

  private scheduleNext() {
    const next = nextNineAmWat();
    const delay = Math.max(5_000, next.getTime() - Date.now());
    this.timer = setTimeout(() => {
      void this.runDigest()
        .catch((err) =>
          this.logger.warn(`Digest failed: ${(err as Error).message}`),
        )
        .finally(() => this.scheduleNext());
    }, delay);
    if (typeof this.timer.unref === 'function') this.timer.unref();
  }

  async runDigest(now = new Date()): Promise<number> {
    const searches = await this.prisma.savedSearch.findMany({
      where: { digestEnabled: true, paused: false },
      take: 2_000,
    });

    let sent = 0;
    const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    for (const search of searches) {
      const filters = (search.filters ?? {}) as Record<string, unknown>;
      const city =
        typeof filters.city === 'string' && filters.city.trim()
          ? filters.city.trim()
          : DEFAULT_CITY;

      const candidates = await this.prisma.listing.findMany({
        where: {
          status: 'LIVE',
          city,
          publishedAt: { gte: since },
        },
        take: 100,
      });

      const matched = candidates.filter((listing) =>
        matchesSavedFilters(
          {
            title: listing.title,
            description: listing.description,
            categoryId: listing.categoryId,
            subcategoryId: listing.subcategoryId,
            priceKobo: listing.priceKobo,
            condition: listing.condition,
            community: listing.community,
            city: listing.city,
            fulfilmentDelivery: listing.fulfilmentDelivery,
            geoLat: listing.geoLat,
            geoLng: listing.geoLng,
            brand: listing.brand,
          },
          filters,
        ),
      );

      if (matched.length === 0) continue;

      const undeduped: typeof matched = [];
      for (const listing of matched) {
        const existing = await this.prisma.savedSearchAlertDedupe.findUnique({
          where: {
            savedSearchId_listingId: {
              savedSearchId: search.id,
              listingId: listing.id,
            },
          },
        });
        if (existing) continue;
        try {
          await this.prisma.savedSearchAlertDedupe.create({
            data: {
              id: randomUUID(),
              savedSearchId: search.id,
              listingId: listing.id,
              notifiedAt: now,
            },
          });
          undeduped.push(listing);
        } catch {
          /* race */
        }
      }

      if (undeduped.length === 0) continue;

      const label = savedSearchLabel(search.name, filters);
      await this.notifications.notify({
        userId: search.userId,
        category: NotificationCategory.SAVED_SEARCH_MATCH,
        title: 'Daily saved search digest',
        body: formatSavedSearchAlertBody(undeduped.length, label),
        deepLink: `/favourites/searches/${search.id}`,
        meta: {
          digest: true,
          savedSearchId: search.id,
          listingIds: undeduped.map((l) => l.id),
          count: undeduped.length,
        },
      });
      sent += 1;
    }

    if (sent > 0) {
      this.logger.log(`Saved-search digests sent: ${sent}`);
    }
    return sent;
  }
}
