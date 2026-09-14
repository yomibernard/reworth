import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CommunitiesController } from './communities.controller';
import { CommunitiesService } from './communities.service';
import { CommunityVisibilityService } from './community-visibility.service';

@Module({
  imports: [PrismaModule, AuthModule, ConfigModule],
  controllers: [CommunitiesController],
  providers: [CommunityVisibilityService, CommunitiesService],
  exports: [CommunityVisibilityService, CommunitiesService],
})
export class CommunitiesModule {}
