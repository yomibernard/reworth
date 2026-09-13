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
import { OPS } from '../admin/admin-roles';
import { CorporateService } from './corporate.service';
import {
  AdminCorporateDecisionDto,
  CorporateApplyDto,
  CreateRelocationProjectDto,
  ProjectIntakeDto,
} from './dto/corporate.dto';

@Controller()
export class CorporateController {
  constructor(private readonly corporate: CorporateService) {}

  @Post('corporate/apply')
  @UseGuards(JwtAuthGuard)
  apply(@CurrentUser() user: AuthUser, @Body() dto: CorporateApplyDto) {
    return this.corporate.apply(user.id, dto);
  }

  @Get('me/corporate')
  @UseGuards(JwtAuthGuard)
  mine(@CurrentUser() user: AuthUser) {
    return this.corporate.getMine(user.id);
  }

  @Post('corporate/projects')
  @UseGuards(JwtAuthGuard)
  createProject(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateRelocationProjectDto,
  ) {
    return this.corporate.createProject(user.id, dto);
  }

  @Get('corporate/projects/:id')
  @UseGuards(JwtAuthGuard)
  getProject(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.corporate.getProject(user.id, id);
  }

  @Post('corporate/projects/:id/intake')
  @UseGuards(JwtAuthGuard)
  intake(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ProjectIntakeDto,
  ) {
    return this.corporate.intake(user.id, id, dto);
  }

  @Post('corporate/projects/:id/complete')
  @UseGuards(JwtAuthGuard)
  complete(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.corporate.complete(user.id, id);
  }

  @Post('corporate/projects/:id/invoice')
  @UseGuards(JwtAuthGuard)
  invoice(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.corporate.generateInvoice(user.id, id);
  }

  @Get('admin/corporate')
  @UseGuards(JwtAuthGuard, RolesGuard, AdminOnlyGuard)
  @Roles(...OPS)
  adminList(@Query('status') status?: string) {
    return this.corporate.listAdminAccounts(status);
  }

  @Post('admin/corporate/:id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard, AdminOnlyGuard)
  @Roles(...OPS)
  adminApprove(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() _dto: AdminCorporateDecisionDto,
  ) {
    return this.corporate.approveAccount(user.id, id);
  }

  @Get('admin/corporate/projects')
  @UseGuards(JwtAuthGuard, RolesGuard, AdminOnlyGuard)
  @Roles(...OPS)
  adminProjects(@Query('corporateAccountId') corporateAccountId?: string) {
    return this.corporate.listAdminProjects(corporateAccountId);
  }
}
