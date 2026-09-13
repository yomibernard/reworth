import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator';
import { IdentityVerifyDto } from './dto/identity.dto';
import { IdentityService } from './identity.service';

@Controller('verifications')
@UseGuards(JwtAuthGuard)
export class IdentityController {
  constructor(private readonly identity: IdentityService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.identity.listVerifications(user.id);
  }

  @Post('identity')
  verify(
    @CurrentUser() user: AuthUser,
    @Body() dto: IdentityVerifyDto,
    @Req() req: { ip?: string },
  ) {
    return this.identity.verifyIdentity(user.id, dto, req.ip);
  }
}
