import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { createAppError } from '@quant/server-core';

export interface Bucket {
  id: string;
  name: string;
  region: string;
  createdAt: Date;
  versioning: boolean;
  publicAccess: boolean;
  objectCount: number;
  totalSize: number;
}

export interface StorageObject {
  id: string;
  bucket: string;
  key: string;
  data: string;
  contentType: string;
  size: number;
  lastModified: Date;
  etag: string;
  metadata: Record<string, string>;
}

export interface StorageMetrics {
  bucket: string;
  objectCount: number;
  totalSize: number;
  requestCount: number;
  bandwidth: number;
  timestamp: Date;
}

export interface BucketPolicy {
  bucket: string;
  statements: PolicyStatement[];
}

export interface PolicyStatement {
  effect: 'allow' | 'deny';
  principals: string[];
  actions: string[];
  resources: string[];
}

export const CreateBucketSchema = z.object({
  name: z
    .string()
    .min(3)
    .max(63)
    .regex(/^[a-z0-9][a-z0-9.-]*[a-z0-9]$/),
  region: z.string().min(1),
  config: z
    .object({
      versioning: z.boolean().optional().default(false),
      publicAccess: z.boolean().optional().default(false),
    })
    .optional()
    .default({}),
});

export type CreateBucketInput = z.infer<typeof CreateBucketSchema>;

export const PutObjectSchema = z.object({
  bucket: z.string().min(1),
  key: z.string().min(1).max(1024),
  data: z.string(),
  contentType: z.string().min(1).optional().default('application/octet-stream'),
  metadata: z.record(z.string()).optional().default({}),
});

export type PutObjectInput = z.input<typeof PutObjectSchema>;

export class ObjectStorageService {
  private readonly buckets = new Map<string, Bucket>();
  private readonly objects = new Map<string, StorageObject>();
  private readonly policies = new Map<string, BucketPolicy>();

  createBucket(input: CreateBucketInput): Bucket {
    const parsed = CreateBucketSchema.parse(input);

    if (this.buckets.has(parsed.name)) {
      throw createAppError('Bucket already exists', 409, 'BUCKET_EXISTS');
    }

    const bucket: Bucket = {
      id: randomUUID(),
      name: parsed.name,
      region: parsed.region,
      createdAt: new Date(),
      versioning: parsed.config.versioning,
      publicAccess: parsed.config.publicAccess,
      objectCount: 0,
      totalSize: 0,
    };

    this.buckets.set(bucket.name, bucket);
    return bucket;
  }

  deleteBucket(bucketName: string): void {
    const bucket = this.getBucket(bucketName);

    if (bucket.objectCount > 0) {
      throw createAppError('Bucket is not empty', 400, 'BUCKET_NOT_EMPTY');
    }

    this.buckets.delete(bucketName);
    this.policies.delete(bucketName);
  }

  putObject(input: PutObjectInput): StorageObject {
    const parsed = PutObjectSchema.parse(input);
    this.getBucket(parsed.bucket);

    const objectKey = `${parsed.bucket}/${parsed.key}`;
    const existingObj = this.objects.get(objectKey);

    const obj: StorageObject = {
      id: randomUUID(),
      bucket: parsed.bucket,
      key: parsed.key,
      data: parsed.data,
      contentType: parsed.contentType,
      size: Buffer.byteLength(parsed.data, 'utf8'),
      lastModified: new Date(),
      etag: randomUUID().replace(/-/g, ''),
      metadata: parsed.metadata,
    };

    this.objects.set(objectKey, obj);

    const bucket = this.getBucket(parsed.bucket);
    if (!existingObj) {
      bucket.objectCount++;
      bucket.totalSize += obj.size;
    } else {
      bucket.totalSize = bucket.totalSize - existingObj.size + obj.size;
    }

    return obj;
  }

  getObject(bucket: string, key: string): StorageObject {
    this.getBucket(bucket);
    const objectKey = `${bucket}/${key}`;
    const obj = this.objects.get(objectKey);

    if (!obj) {
      throw createAppError('Object not found', 404, 'OBJECT_NOT_FOUND');
    }

    return obj;
  }

  deleteObject(bucket: string, key: string): void {
    this.getBucket(bucket);
    const objectKey = `${bucket}/${key}`;
    const obj = this.objects.get(objectKey);

    if (!obj) {
      throw createAppError('Object not found', 404, 'OBJECT_NOT_FOUND');
    }

    this.objects.delete(objectKey);
    const b = this.getBucket(bucket);
    b.objectCount--;
    b.totalSize -= obj.size;
  }

  listObjects(bucket: string, prefix?: string): StorageObject[] {
    this.getBucket(bucket);

    const results: StorageObject[] = [];
    for (const obj of this.objects.values()) {
      if (obj.bucket === bucket) {
        if (!prefix || obj.key.startsWith(prefix)) {
          results.push(obj);
        }
      }
    }

    return results;
  }

  generatePresignedUrl(bucket: string, key: string, expiresIn: number): string {
    this.getBucket(bucket);
    const objectKey = `${bucket}/${key}`;
    const obj = this.objects.get(objectKey);

    if (!obj) {
      throw createAppError('Object not found', 404, 'OBJECT_NOT_FOUND');
    }

    const token = randomUUID();
    const expiry = Date.now() + expiresIn * 1000;
    return `https://${bucket}.storage.quantcloud.io/${key}?token=${token}&expires=${expiry}`;
  }

  setBucketPolicy(bucket: string, policy: BucketPolicy): void {
    this.getBucket(bucket);
    this.policies.set(bucket, { ...policy, bucket });
  }

  getStorageMetrics(bucket: string): StorageMetrics {
    const b = this.getBucket(bucket);

    return {
      bucket: b.name,
      objectCount: b.objectCount,
      totalSize: b.totalSize,
      requestCount: Math.floor(Math.random() * 10000),
      bandwidth: Math.floor(Math.random() * 1000000),
      timestamp: new Date(),
    };
  }

  private getBucket(name: string): Bucket {
    const bucket = this.buckets.get(name);
    if (!bucket) {
      throw createAppError('Bucket not found', 404, 'BUCKET_NOT_FOUND');
    }
    return bucket;
  }
}
