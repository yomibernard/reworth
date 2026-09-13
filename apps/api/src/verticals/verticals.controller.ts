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
import {
  AuthWebhookDto,
  InspectionWebhookDto,
  RequestInspectionDto,
  ScheduleInspectionDto,
} from './dto/verticals.dto';
import { LuxuryAuthService } from './luxury-auth.service';
import { VehicleInspectionsService } from './vehicle-inspections.service';

@Controller()
export class VerticalsController {
  constructor(
    private readonly inspections: VehicleInspectionsService,
    private readonly luxuryAuth: LuxuryAuthService,
  ) {}

  @Post('listings/:id/inspections')
  @UseGuards(JwtAuthGuard)
  requestInspection(
    @CurrentUser() user: AuthUser,
    @Param('id') listingId: string,
    @Body() dto: RequestInspectionDto,
  ) {
    return this.inspections.request(listingId, user.id, dto);
  }

  @Get('listings/:id/inspections')
  latestInspection(@Param('id') listingId: string) {
    return this.inspections.latestForListing(listingId);
  }

  @Post('inspections/:id/pay')
  @UseGuards(JwtAuthGuard)
  payInspection(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.inspections.pay(id, user.id);
  }

  @Post('inspections/:id/schedule')
  @UseGuards(JwtAuthGuard)
  scheduleInspection(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ScheduleInspectionDto,
  ) {
    return this.inspections.schedule(id, user.id, dto);
  }

  @Get('inspections/:id')
  getInspection(@Param('id') id: string) {
    return this.inspections.getById(id);
  }

  @Post('webhooks/inspection-partner')
  inspectionWebhook(@Body() dto: InspectionWebhookDto) {
    return this.inspections.handleWebhook(dto);
  }

  @Post('webhooks/auth-partner')
  authWebhook(@Body() dto: AuthWebhookDto) {
    return this.luxuryAuth.handlePartnerComplete(dto);
  }

  @Get('luxury-auth-jobs/:id')
  @UseGuards(JwtAuthGuard)
  getAuthJob(@Param('id') id: string) {
    return this.luxuryAuth.getJob(id);
  }

  @Get('admin/inspections')
  @UseGuards(JwtAuthGuard, RolesGuard, AdminOnlyGuard)
  @Roles(...OPS, ...LISTINGS_MOD)
  adminInspections(@Query('take') take?: string) {
    return this.inspections.listAdmin(take ? Number(take) : 100);
  }

  @Get('admin/luxury-auth-jobs')
  @UseGuards(JwtAuthGuard, RolesGuard, AdminOnlyGuard)
  @Roles(...OPS, ...LISTINGS_MOD)
  adminAuthJobs(@Query('take') take?: string) {
    return this.luxuryAuth.listAdmin(take ? Number(take) : 100);
  }
}
