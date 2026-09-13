import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AdminRole } from '@prisma/client';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import {
  DisputeEvidenceDto,
  OpenDisputeDto,
  ResolveDisputeDto,
  SellerResponseDto,
} from './dto/disputes.dto';
import { DisputesService } from './disputes.service';

@Controller()
export class DisputesController {
  constructor(private readonly disputes: DisputesService) {}

  @Post('orders/:id/disputes')
  @UseGuards(JwtAuthGuard)
  open(
    @CurrentUser() user: AuthUser,
    @Param('id') orderId: string,
    @Body() dto: OpenDisputeDto,
  ) {
    return this.disputes.open(orderId, user.id, dto);
  }

  @Get('disputes/:id')
  @UseGuards(JwtAuthGuard)
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.disputes.getById(id, user.id);
  }

  @Post('disputes/:id/evidence')
  @UseGuards(JwtAuthGuard)
  evidence(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: DisputeEvidenceDto,
  ) {
    return this.disputes.addEvidence(id, user.id, dto);
  }

  @Post('disputes/:id/response')
  @UseGuards(JwtAuthGuard)
  response(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: SellerResponseDto,
  ) {
    return this.disputes.sellerRespond(id, user.id, dto);
  }

  @Post('admin/disputes/:id/resolution')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    AdminRole.FINANCE,
    AdminRole.SUPER_ADMIN,
    AdminRole.CUSTOMER_SUPPORT,
    AdminRole.OPERATIONS,
  )
  resolve(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ResolveDisputeDto,
  ) {
    return this.disputes.resolve(id, user.id, dto);
  }
}
