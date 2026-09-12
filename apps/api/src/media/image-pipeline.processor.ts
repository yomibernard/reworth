import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  MEDIA_IMAGE_QUEUE,
  MediaService,
  type MediaImageJob,
} from './media.service';

@Processor(MEDIA_IMAGE_QUEUE)
export class ImagePipelineProcessor extends WorkerHost {
  private readonly logger = new Logger(ImagePipelineProcessor.name);

  constructor(private readonly media: MediaService) {
    super();
  }

  async process(job: Job<MediaImageJob>): Promise<void> {
    this.logger.debug(`Processing media job ${job.id} key=${job.data.key}`);
    await this.media.processImageJob(job.data);
  }
}
