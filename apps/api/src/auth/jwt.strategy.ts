import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../common/decorators/current-user.decorator';

export type AccessTokenPayload = {
  sub: string;
  typ: 'access';
  roles: string[];
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_ACCESS_SECRET') ?? 'dev-access-secret',
    });
  }

  async validate(payload: AccessTokenPayload): Promise<AuthUser> {
    if (payload.typ !== 'access' || !payload.sub) {
      throw new UnauthorizedException('Invalid token');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { roles: true },
    });
    if (!user || user.status === 'SUSPENDED' || user.status === 'DELETED') {
      throw new UnauthorizedException('User unavailable');
    }
    return {
      id: user.id,
      roles: user.roles.map((r) => r.role),
    };
  }
}
