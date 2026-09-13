import {
  ConflictException,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AdminRole } from '@prisma/client';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminSeedService implements OnModuleInit {
  private readonly logger = new Logger(AdminSeedService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  async onModuleInit() {
    if (this.config.get<string>('ADMIN_SEED_ON_BOOT') !== 'true') {
      return;
    }
    try {
      await this.ensureSuperAdmin();
    } catch (err) {
      this.logger.warn(
        `Admin seed skipped: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async ensureSuperAdmin() {
    const email = this.config.get<string>('ADMIN_SUPER_EMAIL');
    const password = this.config.get<string>('ADMIN_SUPER_PASSWORD');
    if (!email || !password) {
      this.logger.warn('ADMIN_SUPER_EMAIL/PASSWORD unset — skip seed');
      return null;
    }

    const existing = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { roles: true },
    });

    if (existing) {
      const has = existing.roles.some((r) => r.role === AdminRole.SUPER_ADMIN);
      if (!has) {
        await this.prisma.userRole.create({
          data: { userId: existing.id, role: AdminRole.SUPER_ADMIN },
        });
      }
      return existing;
    }

    try {
      return await this.auth.createUserWithPassword({
        email,
        password,
        displayName: 'Super Admin',
        roles: [AdminRole.SUPER_ADMIN],
      });
    } catch (err) {
      if (err instanceof ConflictException) {
        return this.prisma.user.findUnique({
          where: { email: email.toLowerCase() },
        });
      }
      throw err;
    }
  }
}
