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
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import {
  AttachMovingSaleListingsDto,
  BrowseMovingSalesQueryDto,
  CreateMovingSaleDto,
  MovingSaleEventDto,
  UpdateMovingSaleDto,
} from './dto/moving-sales.dto';
import { MovingSalesService } from './moving-sales.service';

@Controller('moving-sales')
export class MovingSalesController {
  constructor(private readonly movingSales: MovingSalesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateMovingSaleDto) {
    return this.movingSales.create(user.id, dto);
  }

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  browse(
    @Query() query: BrowseMovingSalesQueryDto,
    @CurrentUser() user: AuthUser | null,
  ) {
    return this.movingSales.browse(query, user?.id);
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  getOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser | null,
  ) {
    return this.movingSales.getById(id, user?.id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateMovingSaleDto,
  ) {
    return this.movingSales.update(id, user.id, dto);
  }

  @Post(':id/listings')
  @UseGuards(JwtAuthGuard)
  attach(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: AttachMovingSaleListingsDto,
  ) {
    return this.movingSales.attachListings(id, user.id, dto);
  }

  @Delete(':id/listings/:listingId')
  @UseGuards(JwtAuthGuard)
  detach(
    @Param('id') id: string,
    @Param('listingId') listingId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.movingSales.detachListing(id, listingId, user.id);
  }

  @Post(':id/follow')
  @UseGuards(JwtAuthGuard)
  follow(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.movingSales.follow(id, user.id);
  }

  @Delete(':id/follow')
  @UseGuards(JwtAuthGuard)
  unfollow(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.movingSales.unfollow(id, user.id);
  }

  @Post(':id/events')
  @UseGuards(OptionalJwtAuthGuard)
  events(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser | null,
    @Body() dto: MovingSaleEventDto,
  ) {
    return this.movingSales.recordEvent(id, user?.id ?? null, dto);
  }
}
