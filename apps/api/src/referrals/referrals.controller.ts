import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AdminOnlyGuard } from '../common/guards/admin-only.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ANALYTICS, OPS } from '../admin/admin-roles';
import { AttributeReferralDto } from './dto/referrals.dto';
import { ReferralsService } from './referrals.service';

@Controller()
export class ReferralsController {
  constructor(private readonly referrals: ReferralsService) {}

  @Post('referrals/attribute')
  @UseGuards(JwtAuthGuard)
  attribute(@CurrentUser() user: AuthUser, @Body() dto: AttributeReferralDto) {
    return this.referrals.attribute(user.id, dto);
  }

  @Get('me/referrals')
  @UseGuards(JwtAuthGuard)
  mine(@CurrentUser() user: AuthUser) {
    return this.referrals.getMine(user.id);
  }

  @Get('admin/referrals/stats')
  @UseGuards(JwtAuthGuard, RolesGuard, AdminOnlyGuard)
  @Roles(...OPS, ...ANALYTICS)
  stats() {
    return this.referrals.adminStats();
  }
}
