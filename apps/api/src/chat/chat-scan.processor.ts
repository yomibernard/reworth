import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChatScanService, type ScanHit } from './chat-scan.service';

/**
 * Async-shaped scanner — Phase 4 runs inline (no BullMQ required).
 */
@Injectable()
export class ChatScanProcessor {
  private readonly logger = new Logger(ChatScanProcessor.name);

  constructor(
    private readonly scan: ChatScanService,
    private readonly prisma: PrismaService,
  ) {}

  async processMessage(params: {
    messageId: string;
    body: string | null;
    userId: string;
    listingId: string;
  }): Promise<{ scamWarning: boolean; hit: ScanHit | null }> {
    const hit = await this.scan.scan(params.body);
    if (!hit) return { scamWarning: false, hit: null };

    await this.prisma.message.update({
      where: { id: params.messageId },
      data: { scamWarning: true },
    });
    await this.prisma.riskEvent.create({
      data: {
        userId: params.userId,
        listingId: params.listingId,
        kind: `CHAT_SCAN_${hit.kind}`,
        score: 40,
        detail: {
          messageId: params.messageId,
          pattern: hit.pattern,
          kind: hit.kind,
        },
      },
    });
    this.logger.warn(
      `Scam scan hit on message ${params.messageId}: ${hit.kind}`,
    );
    return { scamWarning: true, hit };
  }
}
