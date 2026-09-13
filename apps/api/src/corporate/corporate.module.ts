import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminOnlyGuard } from '../common/guards/admin-only.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { CorporateController } from './corporate.controller';
import { CorporateService } from './corporate.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [CorporateController],
  providers: [CorporateService, RolesGuard, AdminOnlyGuard],
  exports: [CorporateService],
})
export class CorporateModule {}
