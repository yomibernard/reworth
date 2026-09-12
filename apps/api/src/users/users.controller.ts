import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersService } from './users.service';

@Controller('me')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  getMe(@CurrentUser() user: AuthUser) {
    return this.users.getMe(user.id);
  }

  @Patch()
  updateMe(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.users.updateMe(user.id, dto);
  }

  @Get('devices')
  listDevices(@CurrentUser() user: AuthUser) {
    return this.users.listDevices(user.id);
  }

  @Delete('devices/:id')
  revokeDevice(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.users.revokeDevice(user.id, id);
  }

  @Post('logout-all')
  logoutAll(@CurrentUser() user: AuthUser) {
    return this.users.logoutAll(user.id);
  }

  @Post('delete-request')
  deleteRequest(
    @CurrentUser() user: AuthUser,
    @Req() req: { ip?: string },
  ) {
    return this.users.requestDelete(user.id, req.ip);
  }
}
