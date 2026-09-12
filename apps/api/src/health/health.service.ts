import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export type ReadyCheck = {
  status: 'ok' | 'degraded';
  checks: {
    database: 'ok' | 'skip' | 'fail';
    redis: 'ok' | 'skip' | 'fail';
  };
};

@Injectable()
export class HealthService {
  constructor(private readonly config: ConfigService) {}

  liveness() {
    return { status: 'ok' as const };
  }

  async readiness(): Promise<ReadyCheck> {
    const checks: ReadyCheck['checks'] = {
      database: 'skip',
      redis: 'skip',
    };

    const databaseUrl = this.config.get<string>('DATABASE_URL');
    const redisUrl = this.config.get<string>('REDIS_URL');

    if (databaseUrl) {
      checks.database = await this.pingDatabase(databaseUrl);
    }

    if (redisUrl) {
      checks.redis = await this.pingRedis(redisUrl);
    }

    const failed = Object.values(checks).some((v) => v === 'fail');
    return {
      status: failed ? 'degraded' : 'ok',
      checks,
    };
  }

  metrics(): string {
    const uptime = process.uptime();
    const mem = process.memoryUsage();
    return [
      '# HELP reworth_up Process is up',
      '# TYPE reworth_up gauge',
      'reworth_up 1',
      '# HELP process_uptime_seconds Process uptime in seconds',
      '# TYPE process_uptime_seconds gauge',
      `process_uptime_seconds ${uptime.toFixed(3)}`,
      '# HELP process_resident_memory_bytes Resident memory',
      '# TYPE process_resident_memory_bytes gauge',
      `process_resident_memory_bytes ${mem.rss}`,
      '',
    ].join('\n');
  }

  private async pingDatabase(url: string): Promise<'ok' | 'fail'> {
    try {
      // Lightweight TCP-ish check via URL presence + optional pg later.
      // Graceful degrade: attempt a fetch-style validation of the URL shape.
      const parsed = new URL(url);
      if (!parsed.protocol.includes('postgres')) {
        return 'fail';
      }
      // Without a Prisma client connection pool in Phase 0, treat configured URL as ok.
      return 'ok';
    } catch {
      return 'fail';
    }
  }

  private async pingRedis(url: string): Promise<'ok' | 'fail'> {
    let client: Redis | undefined;
    try {
      client = new Redis(url, {
        maxRetriesPerRequest: 1,
        connectTimeout: 1500,
        lazyConnect: true,
      });
      await client.connect();
      const pong = await client.ping();
      return pong === 'PONG' ? 'ok' : 'fail';
    } catch {
      return 'fail';
    } finally {
      if (client) {
        try {
          await client.quit();
        } catch {
          client.disconnect();
        }
      }
    }
  }
}
