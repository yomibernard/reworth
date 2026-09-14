import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminOnlyGuard } from '../common/guards/admin-only.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { ReferralsController } from './referrals.controller';
import { ReferralsService } from './referrals.service';

@Module({
  imports: [PrismaModule, forwardRef(() => AuthModule)],
  controllers: [ReferralsController],
  providers: [ReferralsService, RolesGuard, AdminOnlyGuard],
  exports: [ReferralsService],
})
export class ReferralsModule {}
