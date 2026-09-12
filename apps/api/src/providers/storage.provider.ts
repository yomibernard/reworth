export type PutObjectInput = {
  bucket: string;
  key: string;
  body: Buffer | Uint8Array;
  contentType: string;
};

export type PutObjectResult = {
  bucket: string;
  key: string;
  url: string;
  etag?: string;
};

export type GetSignedUrlInput = {
  bucket: string;
  key: string;
  expiresInSeconds?: number;
};

/** Object storage abstraction (MinIO / S3-compatible). */
export interface StorageProvider {
  readonly name: string;
  putObject(input: PutObjectInput): Promise<PutObjectResult>;
  getSignedUrl(input: GetSignedUrlInput): Promise<string>;
  deleteObject(bucket: string, key: string): Promise<void>;
}

export const STORAGE_PROVIDER = Symbol('STORAGE_PROVIDER');

/** Local stub that records operations without talking to MinIO. */
export class MinioStorageStub implements StorageProvider {
  readonly name = 'minio-stub';
  private readonly objects = new Map<string, PutObjectResult>();

  private objectId(bucket: string, key: string) {
    return `${bucket}/${key}`;
  }

  async putObject(input: PutObjectInput): Promise<PutObjectResult> {
    const result: PutObjectResult = {
      bucket: input.bucket,
      key: input.key,
      url: `http://localhost:9000/${input.bucket}/${input.key}`,
      etag: `stub-${Date.now()}`,
    };
    this.objects.set(this.objectId(input.bucket, input.key), result);
    return result;
  }

  async getSignedUrl(input: GetSignedUrlInput): Promise<string> {
    const expires = input.expiresInSeconds ?? 3600;
    return `http://localhost:9000/${input.bucket}/${input.key}?X-Amz-Expires=${expires}&stub=1`;
  }

  async deleteObject(bucket: string, key: string): Promise<void> {
    this.objects.delete(this.objectId(bucket, key));
  }
}
