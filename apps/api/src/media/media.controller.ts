import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator';
import { CompleteMediaDto, PresignMediaDto } from './dto/media.dto';
import { MediaService } from './media.service';

@Controller('media')
@UseGuards(JwtAuthGuard)
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Post('presign')
  presign(@CurrentUser() user: AuthUser, @Body() dto: PresignMediaDto) {
    return this.media.presign(user.id, dto);
  }

  @Post('complete')
  complete(@CurrentUser() user: AuthUser, @Body() dto: CompleteMediaDto) {
    return this.media.complete(user.id, dto);
  }
}
