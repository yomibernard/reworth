import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker } from 'bullmq';
import { SavedSearchAlertsService } from './saved-search-alerts.service';

export const SAVED_SEARCH_ALERTS_QUEUE = 'saved-search-alerts';

function redisConnection(url: string) {
  try {
    const u = new URL(url);
    return {
      host: u.hostname,
      port: Number(u.port || 6379),
      password: u.password || undefined,
      maxRetriesPerRequest: null as null,
      lazyConnect: true,
      enableOfflineQueue: false,
    };
  } catch {
    return {
      host: '127.0.0.1',
      port: 6379,
      maxRetriesPerRequest: null as null,
      lazyConnect: true,
      enableOfflineQueue: false,
    };
  }
}

@Injectable()
export class SavedSearchAlertsScheduler
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(SavedSearchAlertsScheduler.name);
  private timer?: ReturnType<typeof setInterval>;
  private queue?: Queue;
  private worker?: Worker;

  constructor(
    private readonly alerts: SavedSearchAlertsService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    const disabled =
      process.env.NODE_ENV === 'test' ||
      this.config.get<string>('SAVED_SEARCH_ALERT_SCHEDULER') === 'false';
    if (disabled) return;

    const intervalMs = Number(
      this.config.get<string>('SAVED_SEARCH_ALERT_INTERVAL_MS') ?? 900_000,
    );
    const redisUrl = this.config.get<string>('REDIS_URL');
    const inline =
      this.config.get<string>('BULLMQ_INLINE') === 'true' || !redisUrl;

    if (!inline && redisUrl) {
      try {
        const connection = redisConnection(redisUrl);
        this.queue = new Queue(SAVED_SEARCH_ALERTS_QUEUE, { connection });
        await this.queue.add(
          'evaluate',
          {},
          {
            repeat: { every: intervalMs },
            removeOnComplete: true,
            jobId: 'saved-search-alerts-repeat',
          },
        );
        this.worker = new Worker(
          SAVED_SEARCH_ALERTS_QUEUE,
          async () => {
            await this.alerts.evaluateActiveSearches();
          },
          { connection },
        );
        this.worker.on('failed', (job, err) => {
          this.logger.warn(`Alert job ${job?.id} failed: ${err.message}`);
        });
        this.logger.log(`BullMQ saved-search alerts every ${intervalMs}ms`);
        return;
      } catch (err) {
        this.logger.warn(
          `BullMQ alerts unavailable, using setInterval: ${(err as Error).message}`,
        );
      }
    }

    this.timer = setInterval(() => {
      void this.alerts.evaluateActiveSearches().catch((e) =>
        this.logger.warn(
          `Saved-search alerts failed: ${(e as Error).message}`,
        ),
      );
    }, intervalMs);
    if (typeof this.timer.unref === 'function') this.timer.unref();
    this.logger.log(`setInterval saved-search alerts every ${intervalMs}ms`);
  }

  async onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    if (this.worker) await this.worker.close().catch(() => undefined);
    if (this.queue) await this.queue.close().catch(() => undefined);
  }
}
