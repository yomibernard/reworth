import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        verifications: {
          orderBy: { createdAt: 'desc' },
        },
        roles: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');

    const profile = user.profile
      ? {
          displayName: user.profile.displayName,
          // Privacy: only expose fullName when showFullName is true
          fullName: user.profile.showFullName ? user.profile.fullName : null,
          avatarUrl: user.profile.avatarUrl,
          bio: user.profile.bio,
          birthYear: user.profile.birthYear,
          preferredCommunity: user.profile.preferredCommunity,
          language: user.profile.language,
          currency: user.profile.currency,
          showFullName: user.profile.showFullName,
          quietHoursStart: user.profile.quietHoursStart,
          quietHoursEnd: user.profile.quietHoursEnd,
        }
      : null;

    const levels = {
      L1_PHONE: user.verifications.some(
        (v) => v.level === 'L1_PHONE' && v.status === 'VERIFIED',
      ),
      L2_EMAIL: user.verifications.some(
        (v) => v.level === 'L2_EMAIL' && v.status === 'VERIFIED',
      ),
      L3_IDENTITY: user.verifications.some(
        (v) => v.level === 'L3_IDENTITY' && v.status === 'VERIFIED',
      ),
    };

    return {
      id: user.id,
      phone: user.phone,
      email: user.email,
      status: user.status,
      phoneVerifiedAt: user.phoneVerifiedAt,
      emailVerifiedAt: user.emailVerifiedAt,
      profile,
      verificationLevels: levels,
      identityVerifiedBadge: levels.L3_IDENTITY,
      roles: user.roles.map((r) => r.role),
      createdAt: user.createdAt,
    };
  }

  async updateMe(userId: string, dto: UpdateProfileDto) {
    const existing = await this.prisma.profile.findUnique({
      where: { userId },
    });
    if (!existing) {
      throw new NotFoundException('Profile not found');
    }

    const updated = await this.prisma.profile.update({
      where: { userId },
      data: {
        ...(dto.displayName !== undefined
          ? { displayName: dto.displayName }
          : {}),
        ...(dto.fullName !== undefined ? { fullName: dto.fullName } : {}),
        ...(dto.avatarUrl !== undefined ? { avatarUrl: dto.avatarUrl } : {}),
        ...(dto.bio !== undefined ? { bio: dto.bio } : {}),
        ...(dto.birthYear !== undefined ? { birthYear: dto.birthYear } : {}),
        ...(dto.preferredCommunity !== undefined
          ? { preferredCommunity: dto.preferredCommunity }
          : {}),
        ...(dto.language !== undefined ? { language: dto.language } : {}),
        ...(dto.currency !== undefined ? { currency: dto.currency } : {}),
        ...(dto.showFullName !== undefined
          ? { showFullName: dto.showFullName }
          : {}),
        ...(dto.quietHoursStart !== undefined
          ? { quietHoursStart: dto.quietHoursStart }
          : {}),
        ...(dto.quietHoursEnd !== undefined
          ? { quietHoursEnd: dto.quietHoursEnd }
          : {}),
      },
    });

    await this.audit.log({
      actorUserId: userId,
      action: 'PROFILE_UPDATED',
      entityType: 'Profile',
      entityId: updated.id,
      beforeJson: {
        displayName: existing.displayName,
        showFullName: existing.showFullName,
      },
      afterJson: {
        displayName: updated.displayName,
        showFullName: updated.showFullName,
      },
    });

    return this.getMe(userId);
  }

  async listDevices(userId: string) {
    const devices = await this.prisma.device.findMany({
      where: { userId, revokedAt: null },
      orderBy: { lastSeenAt: 'desc' },
      select: {
        id: true,
        name: true,
        platform: true,
        lastSeenAt: true,
        createdAt: true,
      },
    });
    return { devices };
  }

  async revokeDevice(userId: string, deviceId: string) {
    const device = await this.prisma.device.findFirst({
      where: { id: deviceId, userId },
    });
    if (!device) throw new NotFoundException('Device not found');

    await this.prisma.$transaction([
      this.prisma.device.update({
        where: { id: deviceId },
        data: { revokedAt: new Date() },
      }),
      this.prisma.refreshToken.updateMany({
        where: { deviceId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    await this.audit.log({
      actorUserId: userId,
      action: 'DEVICE_REVOKED',
      entityType: 'Device',
      entityId: deviceId,
    });

    return { ok: true };
  }

  async logoutAll(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await this.audit.log({
      actorUserId: userId,
      action: 'LOGOUT_ALL',
      entityType: 'User',
      entityId: userId,
    });
    return { ok: true };
  }

  async requestDelete(userId: string, ip?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt: new Date(),
        // Soft-mark for deletion processing; sessions revoked
      },
    });
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await this.audit.log({
      actorUserId: userId,
      action: 'USER_DELETE_REQUESTED',
      entityType: 'User',
      entityId: userId,
      beforeJson: { status: user.status, deletedAt: user.deletedAt },
      afterJson: { deletionRequested: true },
      ip: ip ?? null,
    });

    return { ok: true, deletionRequested: true };
  }
}
