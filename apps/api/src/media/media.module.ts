import { Module, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { MediaController } from './media.controller';
import { MediaService, MEDIA_IMAGE_QUEUE } from './media.service';
import { ImagePipelineProcessor } from './image-pipeline.processor';
import {
  STORAGE_PROVIDER,
  MockStorageAdapter,
} from '../providers/storage.provider';
import { MinioStorageAdapter } from '../providers/minio-storage.adapter';
import {
  MALWARE_SCAN_PROVIDER,
  MockMalwareScanProvider,
} from './malware-scan.provider';

function redisConnection(url: string | undefined) {
  if (!url) {
    return {
      host: '127.0.0.1',
      port: 6379,
      maxRetriesPerRequest: null,
      lazyConnect: true,
      enableOfflineQueue: false,
    };
  }
  try {
    const u = new URL(url);
    return {
      host: u.hostname,
      port: Number(u.port || 6379),
      password: u.password || undefined,
      maxRetriesPerRequest: null,
      lazyConnect: true,
      enableOfflineQueue: false,
    };
  } catch {
    return {
      host: '127.0.0.1',
      port: 6379,
      maxRetriesPerRequest: null,
      lazyConnect: true,
      enableOfflineQueue: false,
    };
  }
}

@Module({
  imports: [
    ConfigModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: redisConnection(config.get<string>('REDIS_URL')),
        // Lazy connect — avoid crashing boot when Redis is down / inline mode
        defaultJobOptions: { removeOnComplete: true },
      }),
    }),
    BullModule.registerQueue({ name: MEDIA_IMAGE_QUEUE }),
  ],
  controllers: [MediaController],
  providers: [
    MediaService,
    ImagePipelineProcessor,
    {
      provide: STORAGE_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const logger = new Logger('StorageProvider');
        const endpoint = config.get<string>('S3_ENDPOINT');
        const useMock =
          process.env.NODE_ENV === 'test' ||
          config.get<string>('MEDIA_PIPELINE') === 'mock' ||
          !endpoint;
        if (useMock) {
          logger.log('Using MockStorageAdapter');
          return new MockStorageAdapter({
            bucket: config.get<string>('S3_BUCKET') ?? 'reworth-media',
            publicBase:
              config.get<string>('S3_PUBLIC_URL') ??
              'http://localhost:9000/reworth-media',
          });
        }
        return new MinioStorageAdapter({
          endpoint: endpoint!,
          region: config.get<string>('S3_REGION') ?? 'us-east-1',
          accessKeyId: config.get<string>('S3_ACCESS_KEY_ID') ?? 'minioadmin',
          secretAccessKey:
            config.get<string>('S3_SECRET_ACCESS_KEY') ?? 'minioadmin',
          bucket: config.get<string>('S3_BUCKET') ?? 'reworth-media',
          forcePathStyle: config.get<string>('S3_FORCE_PATH_STYLE') !== 'false',
          publicUrl: config.get<string>('S3_PUBLIC_URL'),
        });
      },
    },
    {
      provide: MALWARE_SCAN_PROVIDER,
      useClass: MockMalwareScanProvider,
    },
  ],
  exports: [MediaService, STORAGE_PROVIDER, BullModule],
})
export class MediaModule {}
