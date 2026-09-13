import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHmac, randomBytes } from 'crypto';
import { normalizePhone } from '../auth/crypto.util';
import { PrismaService } from '../prisma/prisma.service';
import {
  hashPartnerApiKey,
  safeEqualHex,
} from './partner-api-key.guard';
import type {
  AdminCreateEstatePartnerDto,
  PartnerApproveMembershipDto,
  PartnerMemberSyncDto,
} from './dto/partner.dto';

@Injectable()
export class PartnerService {
  constructor(private readonly prisma: PrismaService) {}

  async adminCreate(adminId: string, dto: AdminCreateEstatePartnerDto) {
    const community = await this.prisma.community.findUnique({
      where: { id: dto.communityId },
    });
    if (!community) throw new NotFoundException('Community not found');

    const rawApiKey = `rwk_${randomBytes(24).toString('hex')}`;
    const webhookSecret = randomBytes(32).toString('hex');
    const prefix = rawApiKey.slice(0, 8);

    const partner = await this.prisma.estatePartner.create({
      data: {
        communityId: dto.communityId,
        companyName: dto.companyName.trim(),
        contactEmail: dto.contactEmail.trim().toLowerCase(),
        status: 'ACTIVE',
        apiKeyHash: hashPartnerApiKey(rawApiKey),
        apiKeyPrefix: prefix,
        webhookSecret,
        webhookUrl: dto.webhookUrl,
        createdById: adminId,
      },
    });

    return {
      id: partner.id,
      communityId: partner.communityId,
      companyName: partner.companyName,
      contactEmail: partner.contactEmail,
      status: partner.status,
      webhookUrl: partner.webhookUrl,
      /** Returned once — store securely. */
      apiKey: rawApiKey,
      webhookSecret,
    };
  }

  verifyWebhookSignature(
    secret: string | null | undefined,
    rawBody: string | Buffer,
    signatureHeader?: string,
  ): void {
    if (!secret) {
      throw new UnauthorizedException('Partner webhook secret not configured');
    }
    if (!signatureHeader) {
      throw new UnauthorizedException('Missing x-reworth-signature');
    }
    const expected = createHmac('sha512', secret)
      .update(typeof rawBody === 'string' ? rawBody : rawBody)
      .digest('hex');
    if (!safeEqualHex(expected, signatureHeader.trim())) {
      throw new UnauthorizedException('Invalid webhook signature');
    }
  }

  async syncMember(
    partnerId: string,
    communityId: string,
    dto: PartnerMemberSyncDto,
    rawPayload: unknown,
  ) {
    // Replay-safe: unique (partnerId, eventId)
    const existing = await this.prisma.estatePartnerWebhookEvent.findUnique({
      where: {
        estatePartnerId_eventId: {
          estatePartnerId: partnerId,
          eventId: dto.eventId,
        },
      },
    });
    if (existing) {
      return {
        replay: true,
        eventId: dto.eventId,
        membership: null,
        message: 'Event already processed',
      };
    }

    const user = await this.resolveUser(dto);
    if (!user) {
      throw new BadRequestException('userPhone or userId did not resolve a user');
    }

    let membership;
    if (dto.eventType === 'member.join') {
      membership = await this.prisma.communityMembership.upsert({
        where: {
          communityId_userId: { communityId, userId: user.id },
        },
        create: {
          communityId,
          userId: user.id,
          status: 'MEMBER',
          joinedAt: new Date(),
        },
        update: {
          status: 'MEMBER',
          joinedAt: new Date(),
        },
      });
    } else {
      membership = await this.prisma.communityMembership.upsert({
        where: {
          communityId_userId: { communityId, userId: user.id },
        },
        create: {
          communityId,
          userId: user.id,
          status: 'LEFT',
        },
        update: {
          status: 'LEFT',
          joinedAt: null,
        },
      });
    }

    try {
      await this.prisma.estatePartnerWebhookEvent.create({
        data: {
          estatePartnerId: partnerId,
          eventId: dto.eventId,
          eventType: dto.eventType,
          payload: rawPayload as object,
        },
      });
    } catch (err) {
      // Concurrent replay
      if (
        err &&
        typeof err === 'object' &&
        'code' in err &&
        (err as { code: string }).code === 'P2002'
      ) {
        return {
          replay: true,
          eventId: dto.eventId,
          membership: null,
          message: 'Event already processed',
        };
      }
      throw err;
    }

    return {
      replay: false,
      eventId: dto.eventId,
      membership: {
        id: membership.id,
        communityId: membership.communityId,
        userId: membership.userId,
        status: membership.status,
        joinedAt: membership.joinedAt,
      },
    };
  }

  async kpisForUser(userId: string) {
    const partner = await this.findPartnerForConsoleUser(userId);
    const communityId = partner.communityId;

    const [members, pending, listingsLive] = await Promise.all([
      this.prisma.communityMembership.count({
        where: {
          communityId,
          status: { in: ['MEMBER', 'APPROVED'] },
        },
      }),
      this.prisma.communityMembership.count({
        where: { communityId, status: 'INVITED' },
      }),
      this.prisma.listing.count({
        where: { communityId, status: 'LIVE' },
      }),
    ]);

    return {
      partnerId: partner.id,
      communityId,
      companyName: partner.companyName,
      kpis: {
        activeMembers: members,
        pendingJoins: pending,
        liveListings: listingsLive,
      },
    };
  }

  async approveMembership(userId: string, dto: PartnerApproveMembershipDto) {
    const partner = await this.findPartnerForConsoleUser(userId);
    const membership = await this.prisma.communityMembership.findUnique({
      where: { id: dto.membershipId },
    });
    if (!membership || membership.communityId !== partner.communityId) {
      throw new NotFoundException('Membership not found in partner community');
    }
    const status = dto.status ?? 'MEMBER';
    const updated = await this.prisma.communityMembership.update({
      where: { id: membership.id },
      data: {
        status,
        joinedAt: status === 'MEMBER' || status === 'APPROVED' ? new Date() : null,
        verifiedById: userId,
      },
    });
    return {
      id: updated.id,
      status: updated.status,
      communityId: updated.communityId,
      userId: updated.userId,
    };
  }

  private async findPartnerForConsoleUser(userId: string) {
    const partner = await this.prisma.estatePartner.findFirst({
      where: {
        OR: [
          { createdById: userId },
          {
            community: {
              managers: { some: { userId } },
            },
          },
        ],
        status: { in: ['ACTIVE', 'APPLIED'] },
      },
    });
    if (!partner) {
      throw new ForbiddenException('No estate partner console access');
    }
    return partner;
  }

  private async resolveUser(dto: PartnerMemberSyncDto) {
    if (dto.userId) {
      return this.prisma.user.findUnique({ where: { id: dto.userId } });
    }
    if (dto.userPhone) {
      const phone = normalizePhone(dto.userPhone);
      return this.prisma.user.findFirst({
        where: {
          OR: [{ phone }, { phone: dto.userPhone.trim() }],
        },
      });
    }
    return null;
  }
}

/** Pure helpers exported for tests. */
export function signPartnerPayload(secret: string, body: string): string {
  return createHmac('sha512', secret).update(body).digest('hex');
}
