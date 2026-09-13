import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AssistantService } from './assistant.service';
import { BundleService } from './bundle.service';
import {
  CreateAssistantSessionDto,
  CreateBundleDto,
  PostAssistantMessageDto,
} from './dto/assistant.dto';

@Controller()
export class AssistantController {
  constructor(
    private readonly assistant: AssistantService,
    private readonly bundles: BundleService,
  ) {}

  @Post('assistant/sessions')
  @UseGuards(JwtAuthGuard)
  createSession(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateAssistantSessionDto,
  ) {
    return this.assistant.createSession(user.id, dto);
  }

  @Post('assistant/sessions/:id/messages')
  @UseGuards(JwtAuthGuard)
  postMessage(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: PostAssistantMessageDto,
  ) {
    return this.assistant.postMessage(
      id,
      user.id,
      dto.content,
      dto.confirmToken,
    );
  }

  @Get('assistant/sessions/:id/messages')
  @UseGuards(JwtAuthGuard)
  listMessages(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.assistant.listMessages(id, user.id);
  }

  @Post('assistant/bundles')
  @UseGuards(JwtAuthGuard)
  createBundle(@CurrentUser() user: AuthUser, @Body() dto: CreateBundleDto) {
    return this.bundles.create(user.id, dto);
  }

  @Get('assistant/bundles/:shareToken')
  getBundle(@Param('shareToken') shareToken: string) {
    return this.bundles.getByShareToken(shareToken);
  }

  @Post('assistant/bundles/:id/save')
  @UseGuards(JwtAuthGuard)
  saveBundle(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.bundles.save(user.id, id);
  }
}
