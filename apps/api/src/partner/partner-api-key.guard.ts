import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

export const PARTNER_KEY_HEADER = 'x-reworth-partner-key';

export type PartnerRequestContext = {
  partnerId: string;
  communityId: string;
  companyName: string;
  webhookSecret: string | null;
};

@Injectable()
export class PartnerApiKeyGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      partner?: PartnerRequestContext;
    }>();
    const rawKey =
      req.headers[PARTNER_KEY_HEADER] ??
      req.headers['X-ReWorth-Partner-Key'.toLowerCase()];
    if (!rawKey || typeof rawKey !== 'string') {
      throw new UnauthorizedException('Missing partner API key');
    }

    const prefix = rawKey.slice(0, 8);
    const hash = hashPartnerApiKey(rawKey);
    const partner = await this.prisma.estatePartner.findFirst({
      where: {
        apiKeyPrefix: prefix,
        apiKeyHash: hash,
        status: 'ACTIVE',
      },
    });
    if (!partner) {
      throw new UnauthorizedException('Invalid partner API key');
    }

    req.partner = {
      partnerId: partner.id,
      communityId: partner.communityId,
      companyName: partner.companyName,
      webhookSecret: partner.webhookSecret,
    };
    return true;
  }
}

export function hashPartnerApiKey(raw: string): string {
  return createHash('sha256').update(`partner:${raw}`).digest('hex');
}

export function safeEqualHex(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}
