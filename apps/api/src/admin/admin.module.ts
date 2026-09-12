import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminSeedService } from './admin-seed.service';
import { AdminUsersController } from './admin-users.controller';

@Module({
  imports: [AuthModule],
  controllers: [AdminUsersController],
  providers: [AdminSeedService],
})
export class AdminModule {}
