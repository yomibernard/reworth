import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    // Soft-connect: allow boot without DB (Docker may be down).
    try {
      await this.$connect();
    } catch {
      // Health readyz will report fail when DATABASE_URL is set.
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
