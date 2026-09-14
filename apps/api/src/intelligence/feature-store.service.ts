import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import Redis from 'ioredis';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { normalizeCity, DEFAULT_CITY } from './city-scope';

export type FeaturePayload = Record<string, unknown>;

@Injectable()
export class FeatureStoreService implements OnModuleDestroy {
  private readonly logger = new Logger(FeatureStoreService.name);
  private readonly memory = new Map<string, FeaturePayload>();
  private redis: Redis | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    const url = this.config.get<string>('REDIS_URL');
    const inline = this.config.get<string>('BULLMQ_INLINE') === 'true';
    if (url && !inline && process.env.NODE_ENV !== 'test') {
      try {
        this.redis = new Redis(url, {
          lazyConnect: true,
          maxRetriesPerRequest: 1,
          enableOfflineQueue: false,
        });
        void this.redis.connect().catch(() => {
          this.logger.warn('FeatureStore Redis unavailable — Map fallback');
          void this.redis?.quit();
          this.redis = null;
        });
      } catch {
        this.redis = null;
      }
    }
  }

  async onModuleDestroy() {
    if (this.redis) await this.redis.quit().catch(() => undefined);
  }

  private userKey(userId: string, city: string) {
    return `uf:${userId}:${normalizeCity(city)}`;
  }

  private listingKey(listingId: string, city: string) {
    return `lf:${listingId}:${normalizeCity(city)}`;
  }

  async getUserFeatures(
    userId: string,
    city = DEFAULT_CITY,
  ): Promise<FeaturePayload> {
    const key = this.userKey(userId, city);
    const hot = await this.getHot(key);
    if (hot) return hot;

    const row = await this.prisma.userFeature.findUnique({
      where: { userId },
    });
    const payload = (row?.payload as FeaturePayload) ?? {};
    await this.setHot(key, payload);
    return payload;
  }

  async getListingFeatures(
    listingId: string,
    city = DEFAULT_CITY,
  ): Promise<FeaturePayload> {
    const key = this.listingKey(listingId, city);
    const hot = await this.getHot(key);
    if (hot) return hot;

    const row = await this.prisma.listingFeature.findUnique({
      where: { listingId },
    });
    const payload = (row?.payload as FeaturePayload) ?? {};
    await this.setHot(key, payload);
    return payload;
  }

  /** Upsert user feature increments from behavioural events. */
  async recordUserEvent(input: {
    userId: string;
    city?: string;
    categoryId?: string | null;
    brand?: string | null;
    community?: string | null;
    priceKobo?: number;
    kind: 'view' | 'save' | 'offer';
  }): Promise<void> {
    const city = normalizeCity(input.city);
    const current = {
      ...((await this.getUserFeatures(input.userId, city)) as {
        categoryScores?: Record<string, number>;
        brandScores?: Record<string, number>;
        communityScores?: Record<string, number>;
        priceMidKobo?: number;
        eventCounts?: Record<string, number>;
      }),
    };

    const bump = (map: Record<string, number>, k: string, by = 1) => {
      map[k] = (map[k] ?? 0) + by;
    };

    current.categoryScores = current.categoryScores ?? {};
    current.brandScores = current.brandScores ?? {};
    current.communityScores = current.communityScores ?? {};
    current.eventCounts = current.eventCounts ?? {};
    bump(current.eventCounts, input.kind);

    if (input.categoryId) bump(current.categoryScores, input.categoryId);
    if (input.brand) bump(current.brandScores, input.brand.toLowerCase());
    if (input.community) bump(current.communityScores, input.community);
    if (input.priceKobo != null && input.priceKobo > 0) {
      const prev = current.priceMidKobo ?? input.priceKobo;
      current.priceMidKobo = Math.round((prev + input.priceKobo) / 2);
    }

    await this.prisma.userFeature.upsert({
      where: { userId: input.userId },
      create: {
        id: randomUUID(),
        userId: input.userId,
        city,
        payload: current as Prisma.InputJsonValue,
      },
      update: {
        city,
        payload: current as Prisma.InputJsonValue,
      },
    });
    await this.setHot(this.userKey(input.userId, city), current);
  }

  async recordListingEvent(input: {
    listingId: string;
    city?: string;
    kind: 'view' | 'save' | 'offer';
  }): Promise<void> {
    const city = normalizeCity(input.city);
    const current = {
      ...((await this.getListingFeatures(input.listingId, city)) as {
        views?: number;
        saves?: number;
        offers?: number;
      }),
    };
    if (input.kind === 'view') current.views = (current.views ?? 0) + 1;
    if (input.kind === 'save') current.saves = (current.saves ?? 0) + 1;
    if (input.kind === 'offer') current.offers = (current.offers ?? 0) + 1;

    await this.prisma.listingFeature.upsert({
      where: { listingId: input.listingId },
      create: {
        id: randomUUID(),
        listingId: input.listingId,
        city,
        payload: current as Prisma.InputJsonValue,
      },
      update: {
        city,
        payload: current as Prisma.InputJsonValue,
      },
    });
    await this.setHot(this.listingKey(input.listingId, city), current);
  }

  /** Test helper — seed hot cache without DB. */
  seedHot(key: string, payload: FeaturePayload) {
    this.memory.set(key, payload);
  }

  private async getHot(key: string): Promise<FeaturePayload | null> {
    if (this.redis) {
      try {
        const raw = await this.redis.get(key);
        if (raw) return JSON.parse(raw) as FeaturePayload;
      } catch {
        /* fall through */
      }
    }
    return this.memory.get(key) ?? null;
  }

  private async setHot(key: string, payload: FeaturePayload) {
    this.memory.set(key, payload);
    if (this.redis) {
      try {
        await this.redis.set(key, JSON.stringify(payload), 'EX', 3600);
      } catch {
        /* ignore */
      }
    }
  }
}
