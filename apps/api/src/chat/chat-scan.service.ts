import { Injectable } from '@nestjs/common';
import { ChatScanKind } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type ScanHit = {
  kind: ChatScanKind;
  pattern: string;
};

@Injectable()
export class ChatScanService {
  constructor(private readonly prisma: PrismaService) {}

  async scan(body: string | null | undefined): Promise<ScanHit | null> {
    if (!body?.trim()) return null;
    const rules = await this.prisma.chatScanRule.findMany({
      where: { enabled: true },
    });
    const lower = body.toLowerCase();
    for (const rule of rules) {
      try {
        const re = new RegExp(rule.pattern, 'i');
        if (re.test(body) || lower.includes(rule.pattern.toLowerCase())) {
          return { kind: rule.kind, pattern: rule.pattern };
        }
      } catch {
        if (lower.includes(rule.pattern.toLowerCase())) {
          return { kind: rule.kind, pattern: rule.pattern };
        }
      }
    }
    return null;
  }
}
