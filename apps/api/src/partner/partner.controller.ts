import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AdminOnlyGuard } from '../common/guards/admin-only.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { OPS } from '../admin/admin-roles';
import {
  PartnerApiKeyGuard,
  type PartnerRequestContext,
} from './partner-api-key.guard';
import { PartnerService } from './partner.service';
import {
  AdminCreateEstatePartnerDto,
  PartnerApproveMembershipDto,
  PartnerMemberSyncDto,
} from './dto/partner.dto';

@Controller()
export class PartnerController {
  constructor(private readonly partner: PartnerService) {}

  @Post('admin/partners/estate')
  @UseGuards(JwtAuthGuard, RolesGuard, AdminOnlyGuard)
  @Roles(...OPS)
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: AdminCreateEstatePartnerDto,
  ) {
    return this.partner.adminCreate(user.id, dto);
  }

  @Get('partner/me/kpis')
  @UseGuards(JwtAuthGuard)
  kpis(@CurrentUser() user: AuthUser) {
    return this.partner.kpisForUser(user.id);
  }

  @Post('partner/me/memberships/approve')
  @UseGuards(JwtAuthGuard)
  approveMembership(
    @CurrentUser() user: AuthUser,
    @Body() dto: PartnerApproveMembershipDto,
  ) {
    return this.partner.approveMembership(user.id, dto);
  }

  /**
   * Estate partnership membership sync (API key + HMAC).
   * Path under /api/v1/partner/members/sync via global prefix.
   */
  @Post('partner/members/sync')
  @UseGuards(PartnerApiKeyGuard)
  syncMembers(
    @Req()
    req: Request & {
      partner?: PartnerRequestContext;
      rawBody?: Buffer | string;
    },
    @Body() dto: PartnerMemberSyncDto,
    @Headers('x-reworth-signature') signature?: string,
  ) {
    const ctx = req.partner!;
    const raw =
      req.rawBody ??
      (typeof req.body === 'string'
        ? req.body
        : JSON.stringify(req.body ?? dto));
    this.partner.verifyWebhookSignature(ctx.webhookSecret, raw, signature);
    return this.partner.syncMember(ctx.partnerId, ctx.communityId, dto, dto);
  }
}
