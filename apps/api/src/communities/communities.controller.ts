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
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { CommunitiesService } from './communities.service';
import {
  CreateCommunityInviteDto,
  ListCommunitiesQueryDto,
  RedeemInviteDto,
} from './dto/communities.dto';

@Controller()
export class CommunitiesController {
  constructor(private readonly communities: CommunitiesService) {}

  @Get('communities')
  @UseGuards(OptionalJwtAuthGuard)
  list(@Query() query: ListCommunitiesQueryDto) {
    return this.communities.list(query);
  }

  @Post('communities/redeem-invite')
  @UseGuards(JwtAuthGuard)
  redeem(@CurrentUser() user: AuthUser, @Body() dto: RedeemInviteDto) {
    return this.communities.redeemInvite(user.id, dto);
  }

  @Get('communities/:slugOrId')
  @UseGuards(OptionalJwtAuthGuard)
  getOne(
    @Param('slugOrId') slugOrId: string,
    @CurrentUser() user: AuthUser | null,
  ) {
    return this.communities.getBySlugOrId(slugOrId, user?.id);
  }

  @Get('me/communities')
  @UseGuards(JwtAuthGuard)
  mine(@CurrentUser() user: AuthUser) {
    return this.communities.listMine(user.id);
  }

  @Post('communities/:id/join-request')
  @UseGuards(JwtAuthGuard)
  joinRequest(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.communities.requestJoin(id, user.id);
  }

  @Post('communities/:id/invites')
  @UseGuards(JwtAuthGuard)
  createInvite(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateCommunityInviteDto,
  ) {
    return this.communities.createInvite(id, user.id, dto);
  }

  @Get('communities/:id/listings')
  @UseGuards(OptionalJwtAuthGuard)
  listings(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser | null,
  ) {
    return this.communities.listListings(id, user?.id);
  }

  @Post('memberships/:id/leave')
  @UseGuards(JwtAuthGuard)
  leave(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.communities.leave(id, user.id);
  }
}
