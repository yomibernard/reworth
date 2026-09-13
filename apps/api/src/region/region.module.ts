import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RegionConfigService } from './region-config.service';
import { RegionController } from './region.controller';

@Global()
@Module({
  imports: [ConfigModule],
  controllers: [RegionController],
  providers: [RegionConfigService],
  exports: [RegionConfigService],
})
export class RegionModule {}
