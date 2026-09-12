import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AdminRole } from '@prisma/client';
import { AuthService } from '../auth/auth.service';
import { AuditService } from '../audit/audit.service';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PrismaService } from '../prisma/prisma.service';
import { AssignRoleDto, CreateAdminUserDto } from './dto/admin-users.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminUsersController {
  constructor(
    private readonly auth: AuthService,
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Post('users')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS)
  async createUser(
    @CurrentUser() actor: AuthUser,
    @Body() dto: CreateAdminUserDto,
    @Req() req: { ip?: string },
  ) {
    const user = await this.auth.createUserWithPassword({
      email: dto.email,
      password: dto.password,
      displayName: dto.displayName,
      roles: dto.roles,
    });

    await this.audit.log({
      actorUserId: actor.id,
      actorRole: actor.roles[0] ?? null,
      action: 'ADMIN_USER_CREATED',
      entityType: 'User',
      entityId: user.id,
      afterJson: { email: user.email, roles: dto.roles },
      ip: req.ip ?? null,
    });

    return {
      id: user.id,
      email: user.email,
      roles: user.roles.map((r) => r.role),
      profile: user.profile,
    };
  }

  @Get('users/:id')
  @Roles(
    AdminRole.SUPER_ADMIN,
    AdminRole.OPERATIONS,
    AdminRole.CUSTOMER_SUPPORT,
    AdminRole.RISK_FRAUD,
  )
  async getUser(@Param('id') id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        profile: true,
        roles: true,
        verifications: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');

    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      status: user.status,
      profile: user.profile
        ? {
            displayName: user.profile.displayName,
            fullName: user.profile.showFullName
              ? user.profile.fullName
              : null,
            showFullName: user.profile.showFullName,
            preferredCommunity: user.profile.preferredCommunity,
          }
        : null,
      roles: user.roles.map((r) => r.role),
      verifications: user.verifications.map((v) => ({
        level: v.level,
        status: v.status,
        method: v.method,
        verifiedAt: v.verifiedAt,
      })),
      createdAt: user.createdAt,
    };
  }

  @Post('users/:id/roles')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS)
  async assignRole(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body() dto: AssignRoleDto,
    @Req() req: { ip?: string },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const role = await this.prisma.userRole.upsert({
      where: { userId_role: { userId: id, role: dto.role } },
      create: { userId: id, role: dto.role },
      update: {},
    });

    await this.audit.log({
      actorUserId: actor.id,
      actorRole: actor.roles[0] ?? null,
      action: 'ADMIN_ROLE_ASSIGNED',
      entityType: 'UserRole',
      entityId: role.id,
      afterJson: { userId: id, role: dto.role },
      ip: req.ip ?? null,
    });

    return { ok: true, userId: id, role: dto.role };
  }

  @Get('finance/summary')
  @Roles(AdminRole.FINANCE, AdminRole.SUPER_ADMIN)
  async financeSummary(
    @CurrentUser() actor: AuthUser,
    @Req() req: { ip?: string },
  ) {
    await this.audit.log({
      actorUserId: actor.id,
      actorRole: actor.roles[0] ?? null,
      action: 'FINANCE_SUMMARY_VIEWED',
      entityType: 'Finance',
      entityId: 'summary',
      ip: req.ip ?? null,
    });
    return { ok: true };
  }
}
