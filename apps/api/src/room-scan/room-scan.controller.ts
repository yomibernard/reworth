import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import {
  CreateRoomScanDto,
  PatchRoomScanItemsDto,
  PublishRoomScanDraftsDto,
} from './dto/room-scan.dto';
import { RoomScanService } from './room-scan.service';

@Controller('room-scans')
@UseGuards(JwtAuthGuard)
export class RoomScanController {
  constructor(private readonly roomScans: RoomScanService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateRoomScanDto) {
    return this.roomScans.create(user.id, dto.photoKeys, dto.city);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.roomScans.get(id, user.id);
  }

  @Post(':id/detect')
  detect(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.roomScans.detect(id, user.id);
  }

  @Patch(':id/items')
  patchItems(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: PatchRoomScanItemsDto,
  ) {
    return this.roomScans.patchItems(id, user.id, dto.items);
  }

  @Post(':id/create-drafts')
  createDrafts(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.roomScans.createDrafts(id, user.id);
  }

  @Get(':id/drafts')
  listDrafts(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.roomScans.listDrafts(id, user.id);
  }

  @Post(':id/publish')
  publish(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: PublishRoomScanDraftsDto,
  ) {
    return this.roomScans.publish(id, user.id, dto.listingIds);
  }
}
