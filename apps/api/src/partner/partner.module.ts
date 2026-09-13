import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminOnlyGuard } from '../common/guards/admin-only.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { PartnerApiKeyGuard } from './partner-api-key.guard';
import { PartnerController } from './partner.controller';
import { PartnerService } from './partner.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [PartnerController],
  providers: [
    PartnerService,
    PartnerApiKeyGuard,
    RolesGuard,
    AdminOnlyGuard,
  ],
  exports: [PartnerService],
})
export class PartnerModule {}
