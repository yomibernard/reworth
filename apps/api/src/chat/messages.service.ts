import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { MessageType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ChatGateway } from './chat.gateway';
import { ChatScanProcessor } from './chat-scan.processor';
import { toMessageDto, type MessageDto } from './message.mapper';
import { redactPhoneEmail } from './pii.util';
import type { PostMessageDto } from './dto/chat.dto';

export type ConversationListItem = {
  id: string;
  listingId: string;
  listingTitle: string;
  listingThumb: string | null;
  buyerId: string;
  sellerId: string;
  counterpart: { id: string; displayName: string };
  lastMessageAt: Date | null;
  lastMessagePreview: string | null;
  unreadCount: number;
  activeOffer: {
    id: string;
    amountKobo: number;
    status: string;
  } | null;
  createdAt: Date;
};

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scanProcessor: ChatScanProcessor,
    @Optional() private readonly gateway?: ChatGateway,
  ) {}

  async isBlockedEitherWay(a: string, b: string): Promise<boolean> {
    const block = await this.prisma.userBlock.findFirst({
      where: {
        OR: [
          { blockerId: a, blockedId: b },
          { blockerId: b, blockedId: a },
        ],
      },
    });
    return !!block;
  }

  async listConversations(userId: string): Promise<ConversationListItem[]> {
    const rows = await this.prisma.conversation.findMany({
      where: {
        OR: [{ buyerId: userId }, { sellerId: userId }],
      },
      orderBy: [{ lastMessageAt: 'desc' }, { createdAt: 'desc' }],
      include: {
        listing: {
          include: {
            images: {
              where: { status: 'READY' },
              orderBy: { sortOrder: 'asc' },
              take: 1,
            },
          },
        },
        buyer: { include: { profile: true } },
        seller: { include: { profile: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        offers: {
          where: { status: 'PENDING' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    const result: ConversationListItem[] = [];
    for (const c of rows) {
      const counterpart =
        c.buyerId === userId
          ? {
              id: c.seller.id,
              displayName: c.seller.profile?.displayName ?? 'Seller',
            }
          : {
              id: c.buyer.id,
              displayName: c.buyer.profile?.displayName ?? 'Buyer',
            };

      const unreadCount = await this.prisma.message.count({
        where: {
          conversationId: c.id,
          senderId: { not: userId },
          readAt: null,
        },
      });

      const thumb = c.listing.images[0];
      const variants = (thumb?.variants ?? {}) as Record<string, string>;
      const last = c.messages[0];
      const offer = c.offers[0];

      result.push({
        id: c.id,
        listingId: c.listingId,
        listingTitle: c.listing.title,
        listingThumb: variants.thumb ?? variants.card ?? thumb?.originalKey ?? null,
        buyerId: c.buyerId,
        sellerId: c.sellerId,
        counterpart,
        lastMessageAt: c.lastMessageAt,
        lastMessagePreview: last?.body
          ? last.body.slice(0, 120)
          : last
            ? `[${last.type}]`
            : null,
        unreadCount,
        activeOffer: offer
          ? { id: offer.id, amountKobo: offer.amountKobo, status: offer.status }
          : null,
        createdAt: c.createdAt,
      });
    }
    return result;
  }

  async createOrGetConversation(userId: string, listingId: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
    });
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.sellerId === userId) {
      throw new ForbiddenException('Cannot start a conversation with yourself');
    }

    if (await this.isBlockedEitherWay(userId, listing.sellerId)) {
      throw new ForbiddenException('Cannot message this user');
    }

    const existing = await this.prisma.conversation.findUnique({
      where: {
        listingId_buyerId_sellerId: {
          listingId,
          buyerId: userId,
          sellerId: listing.sellerId,
        },
      },
    });
    if (existing) return existing;

    return this.prisma.conversation.create({
      data: {
        listingId,
        buyerId: userId,
        sellerId: listing.sellerId,
      },
    });
  }

  async requireParticipant(conversationId: string, userId: string) {
    const c = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });
    if (!c) throw new NotFoundException('Conversation not found');
    if (c.buyerId !== userId && c.sellerId !== userId) {
      throw new ForbiddenException('Not a conversation participant');
    }
    return c;
  }

  async listMessages(
    conversationId: string,
    userId: string,
    opts: { after?: string; limit?: number },
  ): Promise<MessageDto[]> {
    await this.requireParticipant(conversationId, userId);
    const limit = Math.min(opts.limit ?? 50, 100);

    let afterCreatedAt: Date | undefined;
    if (opts.after) {
      const afterMsg = await this.prisma.message.findUnique({
        where: { id: opts.after },
      });
      if (afterMsg) afterCreatedAt = afterMsg.createdAt;
    }

    const rows = await this.prisma.message.findMany({
      where: {
        conversationId,
        ...(afterCreatedAt ? { createdAt: { gt: afterCreatedAt } } : {}),
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
      include: {
        sender: { include: { profile: true } },
      },
    });
    return rows.map(toMessageDto);
  }

  async postMessage(
    conversationId: string,
    userId: string,
    dto: PostMessageDto,
  ): Promise<MessageDto> {
    const conversation = await this.requireParticipant(conversationId, userId);
    const counterpartId =
      conversation.buyerId === userId
        ? conversation.sellerId
        : conversation.buyerId;

    if (await this.isBlockedEitherWay(userId, counterpartId)) {
      throw new ForbiddenException('Cannot message this user');
    }

    if (dto.clientMsgId) {
      const existing = await this.prisma.message.findUnique({
        where: {
          conversationId_clientMsgId: {
            conversationId,
            clientMsgId: dto.clientMsgId,
          },
        },
        include: { sender: { include: { profile: true } } },
      });
      if (existing) return toMessageDto(existing);
    }

    const scrubbed = dto.body != null ? redactPhoneEmail(dto.body) : null;
    const type = dto.type ?? MessageType.TEXT;

    const created = await this.prisma.message.create({
      data: {
        conversationId,
        senderId: userId,
        type,
        body: scrubbed,
        imageKey: dto.imageKey,
        listingCardId: dto.listingCardId,
        clientMsgId: dto.clientMsgId,
      },
      include: { sender: { include: { profile: true } } },
    });

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: created.createdAt },
    });

    const { scamWarning } = await this.scanProcessor.processMessage({
      messageId: created.id,
      body: scrubbed,
      userId,
      listingId: conversation.listingId,
    });

    const message = scamWarning
      ? { ...created, scamWarning: true }
      : created;

    const mapped = toMessageDto(message);
    this.gateway?.emitToConversation(conversationId, 'message.new', mapped);
    return mapped;
  }

  async markRead(
    conversationId: string,
    userId: string,
    messageIds?: string[],
  ) {
    await this.requireParticipant(conversationId, userId);
    const now = new Date();
    await this.prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        readAt: null,
        ...(messageIds?.length ? { id: { in: messageIds } } : {}),
      },
      data: { readAt: now },
    });
    this.gateway?.emitToConversation(conversationId, 'message.read', {
      conversationId,
      readerId: userId,
      readAt: now,
    });
    return { ok: true };
  }

  async blockUser(blockerId: string, blockedId: string) {
    if (blockerId === blockedId) {
      throw new ForbiddenException('Cannot block yourself');
    }
    return this.prisma.userBlock.upsert({
      where: {
        blockerId_blockedId: { blockerId, blockedId },
      },
      create: { blockerId, blockedId },
      update: {},
    });
  }

  async unblockUser(blockerId: string, blockedId: string) {
    await this.prisma.userBlock.deleteMany({
      where: { blockerId, blockedId },
    });
    return { ok: true };
  }

  async reportUser(
    reporterId: string,
    reportedUserId: string,
    dto: { reason: string; detail?: string; conversationId?: string },
  ) {
    if (reporterId === reportedUserId) {
      throw new ForbiddenException('Cannot report yourself');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: reportedUserId },
    });
    if (!user) throw new NotFoundException('User not found');

    return this.prisma.report.create({
      data: {
        reporterId,
        reportedUserId,
        reason: dto.reason,
        detail: dto.detail,
        conversationId: dto.conversationId,
        status: 'OPEN',
      },
    });
  }

  async muteConversation(
    conversationId: string,
    muterId: string,
    mutedId?: string,
  ) {
    const c = await this.requireParticipant(conversationId, muterId);
    const target =
      mutedId ?? (c.buyerId === muterId ? c.sellerId : c.buyerId);
    return this.prisma.userMute.create({
      data: {
        muterId,
        mutedId: target,
        conversationId,
      },
    });
  }
}
