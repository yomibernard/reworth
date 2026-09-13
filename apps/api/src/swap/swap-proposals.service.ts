import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  FulfilmentMethod,
  MessageType,
  SwapProposalStatus,
  TransactionType,
} from '@prisma/client';
import { ListingStateMachine } from '../listings/listing-state.machine';
import { NotificationCategory } from '../notifications/notification-categories';
import { NotificationsService } from '../notifications/notifications.service';
import {
  computeOrderTotalKobo,
  computeProtectionFeeKobo,
} from '../orders/order-fees';
import { PrismaService } from '../prisma/prisma.service';
import type {
  CounterSwapProposalDto,
  CreateSwapProposalDto,
} from './dto/swap.dto';

export type SwapProposalDto = {
  id: string;
  listingId: string;
  proposerId: string;
  offeredListingId: string;
  cashComponentKobo: number;
  note: string | null;
  status: SwapProposalStatus;
  parentProposalId: string | null;
  conversationId: string | null;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export function toSwapProposalDto(p: {
  id: string;
  listingId: string;
  proposerId: string;
  offeredListingId: string;
  cashComponentKobo: number;
  note: string | null;
  status: SwapProposalStatus;
  parentProposalId: string | null;
  conversationId: string | null;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}): SwapProposalDto {
  return {
    id: p.id,
    listingId: p.listingId,
    proposerId: p.proposerId,
    offeredListingId: p.offeredListingId,
    cashComponentKobo: p.cashComponentKobo,
    note: p.note,
    status: p.status,
    parentProposalId: p.parentProposalId,
    conversationId: p.conversationId,
    expiresAt: p.expiresAt,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

@Injectable()
export class SwapProposalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Optional() private readonly notifications?: NotificationsService,
  ) {}

  private expiryHours(): number {
    return Number(this.config.get('SWAP_PROPOSAL_EXPIRY_HOURS') ?? 72);
  }

  private feePct(): number {
    return Number(this.config.get('BUYER_PROTECTION_FEE_PCT') ?? 0.025);
  }

  private feeCap(): number {
    return Number(
      this.config.get('BUYER_PROTECTION_FEE_CAP_KOBO') ?? 500_000,
    );
  }

  async create(
    listingId: string,
    proposerId: string,
    dto: CreateSwapProposalDto,
  ): Promise<SwapProposalDto> {
    const target = await this.prisma.listing.findUnique({
      where: { id: listingId },
    });
    if (!target) throw new NotFoundException('Listing not found');
    if (target.sellerId === proposerId) {
      throw new ForbiddenException('Cannot propose swap on your own listing');
    }
    if (target.status !== 'LIVE') {
      throw new ConflictException('Target listing is not available');
    }
    if (target.sellingMode !== 'SWAP' && target.sellingMode !== 'SWAP_CASH') {
      throw new BadRequestException(
        'Target listing must be SWAP or SWAP_CASH',
      );
    }

    const offered = await this.prisma.listing.findUnique({
      where: { id: dto.offeredListingId },
    });
    if (!offered) throw new NotFoundException('Offered listing not found');
    if (offered.sellerId !== proposerId) {
      throw new ForbiddenException('Offered listing must be owned by proposer');
    }
    if (offered.status !== 'LIVE') {
      throw new ConflictException('Offered listing is not LIVE');
    }
    if (offered.id === listingId) {
      throw new BadRequestException('Cannot offer the same listing');
    }

    const pending = await this.prisma.swapProposal.findFirst({
      where: {
        listingId,
        proposerId,
        status: 'PENDING',
      },
    });
    if (pending) {
      throw new ConflictException(
        'Active pending swap proposal already exists for this listing',
      );
    }

    const cashComponentKobo = dto.cashComponentKobo ?? 0;
    if (cashComponentKobo < 0) {
      throw new BadRequestException('cashComponentKobo must be >= 0');
    }

    let conversationId = dto.conversationId ?? null;
    if (conversationId) {
      const c = await this.prisma.conversation.findUnique({
        where: { id: conversationId },
      });
      if (
        !c ||
        c.listingId !== listingId ||
        (c.buyerId !== proposerId && c.sellerId !== proposerId)
      ) {
        throw new ForbiddenException('Invalid conversation for swap proposal');
      }
    } else {
      const existing = await this.prisma.conversation.findUnique({
        where: {
          listingId_buyerId_sellerId: {
            listingId,
            buyerId: proposerId,
            sellerId: target.sellerId,
          },
        },
      });
      if (existing) {
        conversationId = existing.id;
      } else {
        const created = await this.prisma.conversation.create({
          data: {
            listingId,
            buyerId: proposerId,
            sellerId: target.sellerId,
          },
        });
        conversationId = created.id;
      }
    }

    const expiresAt = new Date(
      Date.now() + this.expiryHours() * 60 * 60 * 1000,
    );

    const proposal = await this.prisma.swapProposal.create({
      data: {
        listingId,
        proposerId,
        offeredListingId: dto.offeredListingId,
        cashComponentKobo,
        note: dto.note,
        status: 'PENDING',
        conversationId,
        expiresAt,
      },
    });

    if (conversationId) {
      await this.prisma.message.create({
        data: {
          conversationId,
          senderId: proposerId,
          type: MessageType.SWAP_PROPOSAL_CARD,
          body: JSON.stringify({
            swapProposalId: proposal.id,
            offeredListingId: dto.offeredListingId,
            cashComponentKobo,
          }),
        },
      });
      await this.prisma.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: new Date() },
      });
    }

    await this.notifications?.notify({
      userId: target.sellerId,
      category: NotificationCategory.NEW_OFFER,
      title: 'New swap proposal',
      body: 'Someone proposed a swap on your listing.',
      deepLink: `reworth://listings/${listingId}/swap`,
      meta: { swapProposalId: proposal.id, listingId },
    });

    return toSwapProposalDto(proposal);
  }

  async listForListing(
    listingId: string,
    userId: string,
  ): Promise<SwapProposalDto[]> {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
    });
    if (!listing) throw new NotFoundException('Listing not found');

    const isSeller = listing.sellerId === userId;
    const proposals = await this.prisma.swapProposal.findMany({
      where: {
        listingId,
        ...(isSeller ? {} : { proposerId: userId }),
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!isSeller && proposals.length === 0) {
      const any = await this.prisma.conversation.findFirst({
        where: {
          listingId,
          OR: [{ buyerId: userId }, { sellerId: userId }],
        },
      });
      if (!any && listing.sellerId !== userId) {
        throw new ForbiddenException('Not a listing participant');
      }
    }

    return proposals.map(toSwapProposalDto);
  }

  async accept(
    proposalId: string,
    sellerId: string,
  ): Promise<{ proposal: SwapProposalDto; order: { id: string } }> {
    const result = await this.prisma.$transaction(async (tx) => {
      const proposal = await tx.swapProposal.findUnique({
        where: { id: proposalId },
      });
      if (!proposal) throw new NotFoundException('Swap proposal not found');

      const target = await tx.listing.findUnique({
        where: { id: proposal.listingId },
      });
      if (!target) throw new NotFoundException('Listing not found');
      if (target.sellerId !== sellerId) {
        throw new ForbiddenException('Only the seller can accept');
      }
      if (proposal.status === 'ACCEPTED') {
        throw new ConflictException('Proposal already accepted');
      }
      if (proposal.status !== 'PENDING') {
        throw new ConflictException(`Proposal is ${proposal.status}`);
      }

      const offered = await tx.listing.findUnique({
        where: { id: proposal.offeredListingId },
      });
      if (!offered) throw new NotFoundException('Offered listing not found');
      if (target.status !== 'LIVE' || offered.status !== 'LIVE') {
        throw new ConflictException('Both listings must be LIVE to accept');
      }

      ListingStateMachine.assertTransition(target.status, 'RESERVED');
      ListingStateMachine.assertTransition(offered.status, 'RESERVED');

      const claimed = await tx.swapProposal.updateMany({
        where: { id: proposalId, status: 'PENDING' },
        data: { status: 'ACCEPTED' },
      });
      if (claimed.count === 0) {
        throw new ConflictException('Proposal already accepted');
      }

      await tx.swapProposal.updateMany({
        where: {
          listingId: proposal.listingId,
          status: 'PENDING',
          id: { not: proposalId },
        },
        data: { status: 'REJECTED' },
      });

      await tx.listing.update({
        where: { id: target.id },
        data: { status: 'RESERVED' },
      });
      await tx.listing.update({
        where: { id: offered.id },
        data: { status: 'RESERVED' },
      });
      await tx.listingEvent.create({
        data: {
          listingId: target.id,
          type: 'STATUS_CHANGED',
          actorUserId: sellerId,
          payload: {
            from: 'LIVE',
            to: 'RESERVED',
            reason: 'swap_accepted',
            swapProposalId: proposalId,
          },
        },
      });
      await tx.listingEvent.create({
        data: {
          listingId: offered.id,
          type: 'STATUS_CHANGED',
          actorUserId: sellerId,
          payload: {
            from: 'LIVE',
            to: 'RESERVED',
            reason: 'swap_accepted',
            swapProposalId: proposalId,
          },
        },
      });

      const cash = Math.max(0, proposal.cashComponentKobo);
      const transactionType =
        cash > 0 ? TransactionType.SWAP_CASH : TransactionType.SWAP;
      const amountKobo = cash;
      const protectionFeeKobo =
        cash > 0
          ? computeProtectionFeeKobo(amountKobo, this.feePct(), this.feeCap())
          : 0;
      const totalKobo = computeOrderTotalKobo({
        amountKobo,
        protectionFeeKobo,
        deliveryFeeKobo: 0,
      });

      const order = await tx.order.create({
        data: {
          listingId: target.id,
          buyerId: proposal.proposerId,
          sellerId: target.sellerId,
          amountKobo,
          protectionFeeKobo,
          deliveryFeeKobo: 0,
          totalKobo,
          fulfilmentMethod: FulfilmentMethod.MEET_POINT,
          status: cash > 0 ? 'PAYMENT_PENDING' : 'CREATED',
          buyerProtection: cash > 0,
          transactionType,
          swapProposalId: proposal.id,
          swapListingAId: target.id,
          swapListingBId: offered.id,
          legAStatus: 'PENDING',
          legBStatus: 'PENDING',
          cashRecipientId: cash > 0 ? target.sellerId : null,
        },
      });

      await tx.orderEvent.create({
        data: {
          orderId: order.id,
          type: 'CREATED',
          actorUserId: sellerId,
          payload: {
            transactionType,
            swapProposalId: proposalId,
            amountKobo,
          },
        },
      });

      const updated = await tx.swapProposal.findUniqueOrThrow({
        where: { id: proposalId },
      });

      return { proposal: updated, order };
    });

    await this.notifications?.notify({
      userId: result.proposal.proposerId,
      category: NotificationCategory.OFFER_ACCEPTED,
      title: 'Swap accepted',
      body: 'Your swap proposal was accepted.',
      deepLink: `reworth://orders/${result.order.id}`,
      meta: { orderId: result.order.id, swapProposalId: proposalId },
    });
    await this.notifications?.notify({
      userId: sellerId,
      category: NotificationCategory.OFFER_ACCEPTED,
      title: 'Swap confirmed',
      body: 'You accepted a swap proposal.',
      deepLink: `reworth://orders/${result.order.id}`,
      meta: { orderId: result.order.id, swapProposalId: proposalId },
    });

    return {
      proposal: toSwapProposalDto(result.proposal),
      order: { id: result.order.id },
    };
  }

  async reject(proposalId: string, sellerId: string): Promise<SwapProposalDto> {
    const proposal = await this.prisma.swapProposal.findUnique({
      where: { id: proposalId },
    });
    if (!proposal) throw new NotFoundException('Swap proposal not found');

    const listing = await this.prisma.listing.findUnique({
      where: { id: proposal.listingId },
    });
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.sellerId !== sellerId) {
      throw new ForbiddenException('Only the seller can reject');
    }
    if (proposal.status !== 'PENDING') {
      throw new ConflictException(`Proposal is ${proposal.status}`);
    }

    const updated = await this.prisma.swapProposal.update({
      where: { id: proposalId },
      data: { status: 'REJECTED' },
    });

    await this.notifications?.notify({
      userId: proposal.proposerId,
      category: NotificationCategory.OFFER_REJECTED,
      title: 'Swap rejected',
      body: 'Your swap proposal was rejected.',
      deepLink: `reworth://listings/${proposal.listingId}`,
      meta: { swapProposalId: proposalId },
    });

    return toSwapProposalDto(updated);
  }

  async counter(
    proposalId: string,
    actorId: string,
    dto: CounterSwapProposalDto,
  ): Promise<SwapProposalDto> {
    const parent = await this.prisma.swapProposal.findUnique({
      where: { id: proposalId },
    });
    if (!parent) throw new NotFoundException('Swap proposal not found');
    if (parent.status !== 'PENDING') {
      throw new ConflictException(`Proposal is ${parent.status}`);
    }

    const listing = await this.prisma.listing.findUnique({
      where: { id: parent.listingId },
    });
    if (!listing) throw new NotFoundException('Listing not found');
    if (actorId !== listing.sellerId && actorId !== parent.proposerId) {
      throw new ForbiddenException('Not a swap participant');
    }

    const offeredListingId = dto.offeredListingId ?? parent.offeredListingId;
    const cashComponentKobo =
      dto.cashComponentKobo ?? parent.cashComponentKobo;

    if (dto.offeredListingId) {
      const offered = await this.prisma.listing.findUnique({
        where: { id: offeredListingId },
      });
      if (!offered) throw new NotFoundException('Offered listing not found');
      // Counter may flip who offers what; offered must stay LIVE and not be target
      if (offered.id === parent.listingId) {
        throw new BadRequestException('Cannot offer the target listing');
      }
      if (offered.status !== 'LIVE') {
        throw new ConflictException('Offered listing is not LIVE');
      }
    }

    const expiresAt = new Date(
      Date.now() + this.expiryHours() * 60 * 60 * 1000,
    );

    const child = await this.prisma.$transaction(async (tx) => {
      await tx.swapProposal.update({
        where: { id: proposalId },
        data: { status: 'COUNTERED' },
      });
      return tx.swapProposal.create({
        data: {
          listingId: parent.listingId,
          proposerId: parent.proposerId,
          offeredListingId,
          cashComponentKobo,
          note: dto.note,
          status: 'PENDING',
          parentProposalId: parent.id,
          conversationId: parent.conversationId,
          expiresAt,
        },
      });
    });

    const notifyUser =
      actorId === parent.proposerId ? listing.sellerId : parent.proposerId;
    await this.notifications?.notify({
      userId: notifyUser,
      category: NotificationCategory.COUNTEROFFER,
      title: 'Swap counter-proposal',
      body: 'A counter swap proposal was made.',
      deepLink: `reworth://listings/${parent.listingId}/swap`,
      meta: { swapProposalId: child.id, parentProposalId: parent.id },
    });

    return toSwapProposalDto(child);
  }

  async withdraw(
    proposalId: string,
    proposerId: string,
  ): Promise<SwapProposalDto> {
    const proposal = await this.prisma.swapProposal.findUnique({
      where: { id: proposalId },
    });
    if (!proposal) throw new NotFoundException('Swap proposal not found');
    if (proposal.proposerId !== proposerId) {
      throw new ForbiddenException('Only the proposer can withdraw');
    }
    if (proposal.status !== 'PENDING') {
      throw new ConflictException(`Proposal is ${proposal.status}`);
    }

    const updated = await this.prisma.swapProposal.update({
      where: { id: proposalId },
      data: { status: 'WITHDRAWN' },
    });
    return toSwapProposalDto(updated);
  }

  async expireDueProposals(now = new Date()): Promise<number> {
    const due = await this.prisma.swapProposal.findMany({
      where: {
        status: 'PENDING',
        expiresAt: { lte: now },
      },
      select: { id: true },
    });
    if (due.length === 0) return 0;

    await this.prisma.swapProposal.updateMany({
      where: { id: { in: due.map((d) => d.id) } },
      data: { status: 'EXPIRED' },
    });
    return due.length;
  }
}
