import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
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
import { CircularService } from './circular.service';
import {
  CreateCircularPartnerDto,
  ScheduleHandoffDto,
  SetDonateIfUnsoldDto,
  UpdateCircularPartnerDto,
} from './dto/circular.dto';

@Controller()
export class CircularController {
  constructor(private readonly circular: CircularService) {}

  @Get('circular/partners')
  list(@Query('city') city?: string) {
    return this.circular.listPartners(city);
  }

  @Post('admin/circular/partners')
  @UseGuards(JwtAuthGuard, RolesGuard, AdminOnlyGuard)
  @Roles(...OPS)
  create(@Body() dto: CreateCircularPartnerDto) {
    return this.circular.createPartner(dto);
  }

  @Patch('admin/circular/partners/:id')
  @UseGuards(JwtAuthGuard, RolesGuard, AdminOnlyGuard)
  @Roles(...OPS)
  update(@Param('id') id: string, @Body() dto: UpdateCircularPartnerDto) {
    return this.circular.updatePartner(id, dto);
  }

  @Delete('admin/circular/partners/:id')
  @UseGuards(JwtAuthGuard, RolesGuard, AdminOnlyGuard)
  @Roles(...OPS)
  remove(@Param('id') id: string) {
    return this.circular.deletePartner(id);
  }

  @Post('circular/handoffs')
  @UseGuards(JwtAuthGuard)
  schedule(@CurrentUser() user: AuthUser, @Body() dto: ScheduleHandoffDto) {
    return this.circular.scheduleHandoff(user.id, dto);
  }

  @Post('circular/handoffs/:id/complete')
  @UseGuards(JwtAuthGuard)
  complete(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.circular.completeHandoff(id, user.id);
  }

  @Post('admin/circular/handoffs/:id/complete')
  @UseGuards(JwtAuthGuard, RolesGuard, AdminOnlyGuard)
  @Roles(...OPS)
  adminComplete(@Param('id') id: string) {
    return this.circular.completeHandoff(id);
  }

  @Post('listings/:id/donate-if-unsold')
  @UseGuards(JwtAuthGuard)
  setDonate(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: SetDonateIfUnsoldDto,
  ) {
    return this.circular.setDonateIfUnsold(
      user.id,
      id,
      dto.donateIfUnsoldDays ?? null,
    );
  }
}
