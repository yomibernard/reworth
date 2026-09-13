import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { normalizeCity } from '../intelligence/city-scope';
import { AnalyticsService } from '../listings/analytics.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  ASSISTANT_PROVIDER,
  MUTATION_TOOLS,
  type AssistantProvider,
} from './assistant.provider';

@Injectable()
export class AssistantService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly analytics: AnalyticsService,
    @Inject(ASSISTANT_PROVIDER) private readonly assistant: AssistantProvider,
  ) {}

  async createSession(
    userId: string,
    opts?: { city?: string; title?: string },
  ) {
    const session = await this.prisma.assistantSession.create({
      data: {
        userId,
        city: normalizeCity(opts?.city),
        title: opts?.title?.trim() || 'Ask ReWorth',
      },
    });
    this.analytics.log('assistant_session_created', {
      sessionId: session.id,
      userId,
    });
    return session;
  }

  async listMessages(sessionId: string, userId: string) {
    await this.requireSession(sessionId, userId);
    return this.prisma.assistantMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async postMessage(
    sessionId: string,
    userId: string,
    content: string,
    confirmToken?: string,
  ) {
    const session = await this.requireSession(sessionId, userId);

    await this.prisma.assistantMessage.create({
      data: {
        sessionId,
        role: 'USER',
        content,
      },
    });

    const catalog = await this.prisma.listing.findMany({
      where: { status: 'LIVE', city: session.city },
      select: {
        id: true,
        title: true,
        priceKobo: true,
        city: true,
        categoryId: true,
        geoLat: true,
        geoLng: true,
        category: { select: { slug: true } },
      },
      take: 100,
    });

    const turn = await this.assistant.routeAndRun({
      sessionId,
      userId,
      city: session.city,
      content,
      confirmToken,
      listingCatalog: catalog.map((l) => ({
        id: l.id,
        title: l.title,
        priceKobo: l.priceKobo,
        city: l.city,
        categoryId: l.categoryId,
        categorySlug: l.category?.slug ?? null,
        geoLat: l.geoLat,
        geoLng: l.geoLng,
      })),
    });

    const confirmed = Boolean(
      confirmToken &&
        MUTATION_TOOLS.has(turn.toolResult.toolName) &&
        !turn.toolResult.proposal,
    );

    await this.prisma.assistantActionLog.create({
      data: {
        sessionId,
        userId,
        toolName: turn.toolResult.toolName,
        input: { content, confirmToken: confirmToken ?? null },
        output: turn.toolResult.payload as Prisma.InputJsonValue,
        confirmed,
        latencyMs: turn.toolResult.latencyMs,
        costMicros: turn.toolResult.costMicros,
        degraded: turn.toolResult.degraded ?? false,
      },
    });

    this.analytics.log('assistant_tool', {
      sessionId,
      userId,
      toolName: turn.toolResult.toolName,
      degraded: turn.toolResult.degraded ?? false,
      confirmed,
      latencyMs: turn.toolResult.latencyMs,
    });

    const assistantMsg = await this.prisma.assistantMessage.create({
      data: {
        sessionId,
        role: 'ASSISTANT',
        content: turn.reply,
        toolName: turn.toolResult.toolName,
        toolPayload: turn.toolResult.payload as Prisma.InputJsonValue,
      },
    });

    await this.prisma.assistantSession.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() },
    });

    return {
      message: assistantMsg,
      toolName: turn.toolResult.toolName,
      proposal: turn.toolResult.proposal ?? null,
      degraded: turn.toolResult.degraded ?? false,
      confirmed,
      payload: turn.toolResult.payload,
    };
  }

  /**
   * Confirm a previously proposed mutation by posting the confirmToken again.
   */
  async confirmMutation(
    sessionId: string,
    userId: string,
    confirmToken: string,
  ) {
    if (!confirmToken) {
      throw new ForbiddenException('confirmToken required');
    }
    return this.postMessage(
      sessionId,
      userId,
      'confirm',
      confirmToken,
    );
  }

  private async requireSession(sessionId: string, userId: string) {
    const session = await this.prisma.assistantSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) throw new NotFoundException('Session not found');
    if (session.userId !== userId) {
      throw new ForbiddenException('Not your assistant session');
    }
    return session;
  }
}
