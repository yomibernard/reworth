import {
  Body,
  Controller,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AdminOnlyGuard } from '../common/guards/admin-only.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator';
import { AdminAuthService } from './admin-auth.service';
import { AdminLoginDto, AdminTotpVerifyDto } from './dto/admin-ops.dto';

@Controller('admin/auth')
export class AdminAuthController {
  constructor(
    private readonly adminAuth: AdminAuthService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  @Post('login')
  login(@Body() dto: AdminLoginDto, @Req() req: { ip?: string }) {
    return this.adminAuth.login(dto, req.ip);
  }

  @Post('totp/setup')
  @UseGuards(JwtAuthGuard, AdminOnlyGuard)
  setup(@CurrentUser() user: AuthUser) {
    return this.adminAuth.setupTotp(user.id);
  }

  /**
   * Completes login (challengeToken + code) or enables TOTP (Bearer + code).
   */
  @Post('totp/verify')
  async verify(
    @Body() dto: AdminTotpVerifyDto,
    @Req() req: { ip?: string; headers?: { authorization?: string } },
  ) {
    let actorId: string | undefined;
    if (!dto.challengeToken) {
      const header = req.headers?.authorization;
      if (!header?.startsWith('Bearer ')) {
        throw new UnauthorizedException(
          'challengeToken or Bearer token required',
        );
      }
      try {
        const payload = await this.jwt.verifyAsync<{
          sub?: string;
          typ?: string;
        }>(header.slice(7), {
          secret:
            this.config.get<string>('JWT_ACCESS_SECRET') ?? 'dev-access-secret',
        });
        if (payload.typ !== 'access' || !payload.sub) {
          throw new UnauthorizedException('Invalid token');
        }
        actorId = payload.sub;
      } catch {
        throw new UnauthorizedException('Invalid token');
      }
    }
    return this.adminAuth.verifyTotp(dto, actorId, req.ip);
  }
}
