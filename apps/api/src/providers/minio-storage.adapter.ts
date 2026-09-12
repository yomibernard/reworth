import {
  PutObjectCommand,
  S3Client,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type {
  GetSignedUrlInput,
  PutObjectInput,
  PutObjectResult,
  StorageProvider,
} from './storage.provider';

export type MinioStorageConfig = {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  forcePathStyle?: boolean;
  publicUrl?: string;
};

export class MinioStorageAdapter implements StorageProvider {
  readonly name = 'minio';
  private readonly client: S3Client;
  readonly bucket: string;
  private readonly publicBase: string;

  constructor(config: MinioStorageConfig) {
    this.bucket = config.bucket;
    this.publicBase =
      config.publicUrl ??
      `${config.endpoint.replace(/\/$/, '')}/${config.bucket}`;
    this.client = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      forcePathStyle: config.forcePathStyle ?? true,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  async putObject(input: PutObjectInput): Promise<PutObjectResult> {
    const body = Buffer.isBuffer(input.body)
      ? input.body
      : Buffer.from(input.body);
    await this.client.send(
      new PutObjectCommand({
        Bucket: input.bucket,
        Key: input.key,
        Body: body,
        ContentType: input.contentType,
      }),
    );
    return {
      bucket: input.bucket,
      key: input.key,
      url: this.publicUrl(input.key),
    };
  }

  async getSignedUrl(input: GetSignedUrlInput): Promise<string> {
    const expires = input.expiresInSeconds ?? 3600;
    if (input.method === 'PUT') {
      const cmd = new PutObjectCommand({
        Bucket: input.bucket,
        Key: input.key,
        ContentType: input.contentType,
      });
      return getSignedUrl(this.client, cmd, { expiresIn: expires });
    }
    const cmd = new GetObjectCommand({
      Bucket: input.bucket,
      Key: input.key,
    });
    return getSignedUrl(this.client, cmd, { expiresIn: expires });
  }

  async getObject(bucket: string, key: string): Promise<Buffer | null> {
    try {
      const res = await this.client.send(
        new GetObjectCommand({ Bucket: bucket, Key: key }),
      );
      if (!res.Body) return null;
      const bytes = await res.Body.transformToByteArray();
      return Buffer.from(bytes);
    } catch {
      return null;
    }
  }

  async deleteObject(bucket: string, key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: bucket, Key: key }),
    );
  }

  publicUrl(key: string): string {
    return `${this.publicBase.replace(/\/$/, '')}/${key}`;
  }
}
