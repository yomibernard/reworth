import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator';
import {
  CreateSavedSearchDto,
  UpdateSavedSearchDto,
} from './dto/favourites.dto';
import { FavouritesService } from './favourites.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class FavouritesController {
  constructor(private readonly favourites: FavouritesService) {}

  @Post('listings/:id/favourite')
  favourite(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.favourites.favourite(user.id, id);
  }

  @Delete('listings/:id/favourite')
  unfavourite(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.favourites.unfavourite(user.id, id);
  }

  @Post('users/:id/follow')
  follow(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.favourites.follow(user.id, id);
  }

  @Delete('users/:id/follow')
  unfollow(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.favourites.unfollow(user.id, id);
  }

  @Get('me/favourites')
  meFavourites(@CurrentUser() user: AuthUser) {
    return this.favourites.getMeFavourites(user.id);
  }

  @Get('me/saved-searches')
  listSaved(@CurrentUser() user: AuthUser) {
    return this.favourites.listSavedSearches(user.id);
  }

  @Post('me/saved-searches')
  createSaved(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateSavedSearchDto,
  ) {
    return this.favourites.createSavedSearch(user.id, dto);
  }

  @Patch('me/saved-searches/:id')
  updateSaved(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateSavedSearchDto,
  ) {
    return this.favourites.updateSavedSearch(user.id, id, dto);
  }

  @Delete('me/saved-searches/:id')
  deleteSaved(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.favourites.deleteSavedSearch(user.id, id);
  }
}
