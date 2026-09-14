import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AttributeReferralDto } from './dto/referrals.dto';

@Injectable()
export class ReferralsService {
  private readonly logger = new Logger(ReferralsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async ensureCode(userId: string) {
    const existing = await this.prisma.referralCode.findUnique({
      where: { userId },
    });
    if (existing) return existing;

    for (let attempt = 0; attempt < 8; attempt++) {
      const code = this.generateShortCode();
      try {
        return await this.prisma.referralCode.create({
          data: { userId, code },
        });
      } catch (err) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2002'
        ) {
          continue;
        }
        throw err;
      }
    }
    throw new ConflictException('Could not allocate referral code');
  }

  generateShortCode(): string {
    return randomBytes(4).toString('base64url').replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase();
  }

  async attribute(referredUserId: string, dto: AttributeReferralDto) {
    const codeRow = await this.prisma.referralCode.findUnique({
      where: { code: dto.code.trim().toUpperCase() },
    });
    if (!codeRow) throw new NotFoundException('Invalid referral code');

    if (codeRow.userId === referredUserId) {
      return this.blockAttribution({
        referralCodeId: codeRow.id,
        referrerId: codeRow.userId,
        referredUserId,
        deviceFingerprintHash: dto.deviceFingerprintHash,
        reason: 'self_referral',
      });
    }

    const existing = await this.prisma.referralAttribution.findUnique({
      where: { referredUserId },
    });
    if (existing) {
      return existing;
    }

    if (dto.deviceFingerprintHash) {
      const reuse = await this.prisma.referralAttribution.findFirst({
        where: {
          deviceFingerprintHash: dto.deviceFingerprintHash,
          riskFlagged: false,
        },
      });
      if (reuse) {
        return this.blockAttribution({
          referralCodeId: codeRow.id,
          referrerId: codeRow.userId,
          referredUserId,
          deviceFingerprintHash: dto.deviceFingerprintHash,
          reason: 'device_fingerprint_reuse',
        });
      }
    }

    const config = await this.getConfig();
    if (!config.active) {
      throw new BadRequestException('Referral programme inactive');
    }

    const dayStart = new Date();
    dayStart.setUTCHours(0, 0, 0, 0);
    const rewardsToday = await this.prisma.referralReward.count({
      where: {
        userId: codeRow.userId,
        status: 'GRANTED',
        grantedAt: { gte: dayStart },
      },
    });
    if (rewardsToday >= config.maxRewardsPerReferrerPerDay) {
      return this.blockAttribution({
        referralCodeId: codeRow.id,
        referrerId: codeRow.userId,
        referredUserId,
        deviceFingerprintHash: dto.deviceFingerprintHash,
        reason: 'velocity_cap',
      });
    }

    return this.prisma.referralAttribution.create({
      data: {
        referralCodeId: codeRow.id,
        referrerId: codeRow.userId,
        referredUserId,
        deviceFingerprintHash: dto.deviceFingerprintHash ?? null,
        phoneVerifiedAt: new Date(),
        riskFlagged: false,
      },
    });
  }

  private async blockAttribution(input: {
    referralCodeId: string;
    referrerId: string;
    referredUserId: string;
    deviceFingerprintHash?: string;
    reason: string;
  }) {
    const existing = await this.prisma.referralAttribution.findUnique({
      where: { referredUserId: input.referredUserId },
    });
    if (existing) {
      return this.prisma.referralAttribution.update({
        where: { id: existing.id },
        data: {
          riskFlagged: true,
          riskReason: input.reason,
        },
      });
    }

    const attribution = await this.prisma.referralAttribution.create({
      data: {
        referralCodeId: input.referralCodeId,
        referrerId: input.referrerId,
        referredUserId: input.referredUserId,
        deviceFingerprintHash: input.deviceFingerprintHash ?? null,
        phoneVerifiedAt: new Date(),
        riskFlagged: true,
        riskReason: input.reason,
      },
    });

    await this.prisma.referralReward.create({
      data: {
        attributionId: attribution.id,
        userId: input.referrerId,
        status: 'BLOCKED',
        rewardType: 'FREE_BOOST',
        meta: { reason: input.reason },
      },
    });

    this.logger.warn({
      event: 'referral.blocked',
      reason: input.reason,
      referredUserId: input.referredUserId,
    });

    return attribution;
  }

  /**
   * On first COMPLETED order by referred user → FREE_BOOST for both parties.
   * One reward grant cycle per referred account.
   */
  async onOrderCompleted(buyerId: string, orderId: string): Promise<void> {
    const attribution = await this.prisma.referralAttribution.findUnique({
      where: { referredUserId: buyerId },
      include: { rewards: true },
    });
    if (!attribution) return;
    if (attribution.riskFlagged) return;
    if (attribution.firstTxnAt) return;

    const alreadyGranted = attribution.rewards.some(
      (r) => r.status === 'GRANTED',
    );
    if (alreadyGranted) return;

    const config = await this.getConfig();
    const rewardType = config.rewardType || 'FREE_BOOST';
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.referralAttribution.update({
        where: { id: attribution.id },
        data: { firstTxnAt: now },
      });

      for (const userId of [attribution.referrerId, attribution.referredUserId]) {
        await tx.referralReward.create({
          data: {
            attributionId: attribution.id,
            userId,
            status: 'GRANTED',
            rewardType,
            grantedAt: now,
            meta: { orderId, kind: rewardType },
          },
        });
      }
    });

    this.logger.log({
      event: 'referral.rewarded',
      attributionId: attribution.id,
      orderId,
      buyerId,
    });
  }

  async getMine(userId: string) {
    const code = await this.ensureCode(userId);
    const invited = await this.prisma.referralAttribution.findMany({
      where: { referrerId: userId },
      orderBy: { registeredAt: 'desc' },
      include: {
        rewards: true,
        referred: {
          select: {
            id: true,
            profile: { select: { displayName: true } },
          },
        },
      },
    });

    return {
      code: code.code,
      invited: invited.map((a) => ({
        referredUserId: a.referredUserId,
        displayName: a.referred.profile?.displayName ?? null,
        registeredAt: a.registeredAt,
        phoneVerifiedAt: a.phoneVerifiedAt,
        firstTxnAt: a.firstTxnAt,
        riskFlagged: a.riskFlagged,
        riskReason: a.riskReason,
        status: a.firstTxnAt
          ? 'rewarded'
          : a.phoneVerifiedAt
            ? 'registered'
            : 'invited',
        rewards: a.rewards,
      })),
    };
  }

  async adminStats() {
    const [attributions, rewards, blocked] = await Promise.all([
      this.prisma.referralAttribution.count(),
      this.prisma.referralReward.count({ where: { status: 'GRANTED' } }),
      this.prisma.referralReward.count({ where: { status: 'BLOCKED' } }),
    ]);
    const ledger = await this.prisma.referralReward.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return {
      attributions,
      rewardsGranted: rewards,
      rewardsBlocked: blocked,
      ledger,
    };
  }

  private async getConfig() {
    let config = await this.prisma.referralProgrammeConfig.findUnique({
      where: { key: 'default' },
    });
    if (!config) {
      config = await this.prisma.referralProgrammeConfig.create({
        data: {
          key: 'default',
          rewardType: 'FREE_BOOST',
          maxRewardsPerReferrerPerDay: 10,
          active: true,
        },
      });
    }
    return config;
  }
}
