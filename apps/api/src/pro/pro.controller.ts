import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AdminOnlyGuard } from '../common/guards/admin-only.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { LISTINGS_MOD, OPS } from '../admin/admin-roles';
import { BulkUploadService } from './bulk-upload.service';
import { AdminProDecisionDto, BulkUploadDto, ProApplyDto } from './dto/pro.dto';
import { ProAccountsService } from './pro-accounts.service';

@Controller()
export class ProController {
  constructor(
    private readonly proAccounts: ProAccountsService,
    private readonly bulkUpload: BulkUploadService,
  ) {}

  @Post('pro/apply')
  @UseGuards(JwtAuthGuard)
  apply(@CurrentUser() user: AuthUser, @Body() dto: ProApplyDto) {
    return this.proAccounts.apply(user.id, dto);
  }

  @Get('me/pro')
  @UseGuards(JwtAuthGuard)
  mine(@CurrentUser() user: AuthUser) {
    return this.proAccounts.getMine(user.id);
  }

  @Post('me/pro/bulk-upload')
  @UseGuards(JwtAuthGuard)
  bulk(@CurrentUser() user: AuthUser, @Body() dto: BulkUploadDto) {
    return this.bulkUpload.upload(user.id, dto);
  }

  @Post('me/pro/subscribe')
  @UseGuards(JwtAuthGuard)
  subscribe(@CurrentUser() user: AuthUser) {
    return this.proAccounts.subscribe(user.id);
  }

  @Get('storefronts/:handle')
  storefront(@Param('handle') handle: string) {
    return this.proAccounts.getStorefront(handle);
  }

  /** Alias: GET /@handle via storefronts path — clients map @handle → storefronts/:handle */

  @Get('admin/pro-sellers')
  @UseGuards(JwtAuthGuard, RolesGuard, AdminOnlyGuard)
  @Roles(...OPS, ...LISTINGS_MOD)
  queue(@Query('status') status?: string) {
    return this.proAccounts.listQueue(status);
  }

  @Post('admin/pro-sellers/:id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard, AdminOnlyGuard)
  @Roles(...OPS)
  approve(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: AdminProDecisionDto,
  ) {
    return this.proAccounts.approve(user.id, id, dto);
  }

  @Post('admin/pro-sellers/:id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard, AdminOnlyGuard)
  @Roles(...OPS)
  reject(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: AdminProDecisionDto,
  ) {
    return this.proAccounts.reject(user.id, id, dto);
  }
}
