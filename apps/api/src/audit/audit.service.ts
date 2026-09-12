import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type AuditInput = {
  actorUserId?: string | null;
  actorRole?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  beforeJson?: Prisma.InputJsonValue | null;
  afterJson?: Prisma.InputJsonValue | null;
  ip?: string | null;
};

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(input: AuditInput) {
    try {
      return await this.prisma.auditLog.create({
        data: {
          actorUserId: input.actorUserId ?? null,
          actorRole: input.actorRole ?? null,
          action: input.action,
          entityType: input.entityType,
          entityId: input.entityId ?? null,
          beforeJson: input.beforeJson ?? undefined,
          afterJson: input.afterJson ?? undefined,
          ip: input.ip ?? null,
        },
      });
    } catch {
      // Never fail the primary flow if audit write fails (e.g. DB down in tests).
      return null;
    }
  }
}
