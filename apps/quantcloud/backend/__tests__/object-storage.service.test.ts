import { describe, it, expect, beforeEach } from 'vitest';
import { ObjectStorageService } from '../services/object-storage.service';
import type { CreateBucketInput } from '../services/object-storage.service';

describe('ObjectStorageService', () => {
  let service: ObjectStorageService;

  const defaultBucket: CreateBucketInput = {
    name: 'my-bucket',
    region: 'us-east-1',
    config: { versioning: false, publicAccess: false },
  };

  beforeEach(() => {
    service = new ObjectStorageService();
  });

  describe('createBucket', () => {
    it('creates a bucket with correct properties', () => {
      const bucket = service.createBucket(defaultBucket);

      expect(bucket.id).toBeDefined();
      expect(bucket.name).toBe('my-bucket');
      expect(bucket.region).toBe('us-east-1');
      expect(bucket.versioning).toBe(false);
      expect(bucket.publicAccess).toBe(false);
      expect(bucket.objectCount).toBe(0);
      expect(bucket.totalSize).toBe(0);
      expect(bucket.createdAt).toBeInstanceOf(Date);
    });

    it('throws if bucket name already exists', () => {
      service.createBucket(defaultBucket);

      expect(() => service.createBucket(defaultBucket)).toThrow('Bucket already exists');
    });
  });

  describe('deleteBucket', () => {
    it('deletes an empty bucket', () => {
      service.createBucket(defaultBucket);
      service.deleteBucket('my-bucket');

      expect(() => service.deleteBucket('my-bucket')).toThrow('Bucket not found');
    });

    it('throws if bucket is not empty', () => {
      service.createBucket(defaultBucket);
      service.putObject({ bucket: 'my-bucket', key: 'file.txt', data: 'hello' });

      expect(() => service.deleteBucket('my-bucket')).toThrow('Bucket is not empty');
    });

    it('throws if bucket does not exist', () => {
      expect(() => service.deleteBucket('non-existent')).toThrow('Bucket not found');
    });
  });

  describe('putObject', () => {
    it('stores an object in a bucket', () => {
      service.createBucket(defaultBucket);

      const obj = service.putObject({
        bucket: 'my-bucket',
        key: 'docs/readme.md',
        data: '# Hello World',
        contentType: 'text/markdown',
      });

      expect(obj.id).toBeDefined();
      expect(obj.bucket).toBe('my-bucket');
      expect(obj.key).toBe('docs/readme.md');
      expect(obj.data).toBe('# Hello World');
      expect(obj.contentType).toBe('text/markdown');
      expect(obj.size).toBeGreaterThan(0);
      expect(obj.etag).toBeDefined();
    });

    it('updates object count on bucket', () => {
      service.createBucket(defaultBucket);
      service.putObject({ bucket: 'my-bucket', key: 'a.txt', data: 'a' });
      service.putObject({ bucket: 'my-bucket', key: 'b.txt', data: 'b' });

      const metrics = service.getStorageMetrics('my-bucket');
      expect(metrics.objectCount).toBe(2);
    });

    it('overwrites existing object with same key', () => {
      service.createBucket(defaultBucket);
      service.putObject({ bucket: 'my-bucket', key: 'file.txt', data: 'old' });
      const obj = service.putObject({ bucket: 'my-bucket', key: 'file.txt', data: 'new content' });

      expect(obj.data).toBe('new content');
      const metrics = service.getStorageMetrics('my-bucket');
      expect(metrics.objectCount).toBe(1);
    });

    it('throws if bucket does not exist', () => {
      expect(() =>
        service.putObject({ bucket: 'non-existent', key: 'file.txt', data: 'data' }),
      ).toThrow('Bucket not found');
    });
  });

  describe('getObject', () => {
    it('retrieves an object by bucket and key', () => {
      service.createBucket(defaultBucket);
      service.putObject({ bucket: 'my-bucket', key: 'test.txt', data: 'test data' });

      const obj = service.getObject('my-bucket', 'test.txt');

      expect(obj.key).toBe('test.txt');
      expect(obj.data).toBe('test data');
    });

    it('throws if object does not exist', () => {
      service.createBucket(defaultBucket);

      expect(() => service.getObject('my-bucket', 'missing.txt')).toThrow('Object not found');
    });
  });

  describe('deleteObject', () => {
    it('removes an object from the bucket', () => {
      service.createBucket(defaultBucket);
      service.putObject({ bucket: 'my-bucket', key: 'file.txt', data: 'data' });

      service.deleteObject('my-bucket', 'file.txt');

      expect(() => service.getObject('my-bucket', 'file.txt')).toThrow('Object not found');
    });

    it('updates bucket object count', () => {
      service.createBucket(defaultBucket);
      service.putObject({ bucket: 'my-bucket', key: 'file.txt', data: 'data' });
      service.deleteObject('my-bucket', 'file.txt');

      const metrics = service.getStorageMetrics('my-bucket');
      expect(metrics.objectCount).toBe(0);
    });

    it('throws if object does not exist', () => {
      service.createBucket(defaultBucket);

      expect(() => service.deleteObject('my-bucket', 'missing.txt')).toThrow('Object not found');
    });
  });

  describe('listObjects', () => {
    it('lists all objects in a bucket', () => {
      service.createBucket(defaultBucket);
      service.putObject({ bucket: 'my-bucket', key: 'a.txt', data: 'a' });
      service.putObject({ bucket: 'my-bucket', key: 'b.txt', data: 'b' });

      const objects = service.listObjects('my-bucket');

      expect(objects).toHaveLength(2);
    });

    it('filters objects by prefix', () => {
      service.createBucket(defaultBucket);
      service.putObject({ bucket: 'my-bucket', key: 'docs/a.md', data: 'a' });
      service.putObject({ bucket: 'my-bucket', key: 'docs/b.md', data: 'b' });
      service.putObject({ bucket: 'my-bucket', key: 'images/pic.png', data: 'img' });

      const objects = service.listObjects('my-bucket', 'docs/');

      expect(objects).toHaveLength(2);
      expect(objects.every((o) => o.key.startsWith('docs/'))).toBe(true);
    });

    it('returns empty array for empty bucket', () => {
      service.createBucket(defaultBucket);

      const objects = service.listObjects('my-bucket');

      expect(objects).toHaveLength(0);
    });
  });

  describe('generatePresignedUrl', () => {
    it('generates a presigned URL for an existing object', () => {
      service.createBucket(defaultBucket);
      service.putObject({ bucket: 'my-bucket', key: 'secret.pdf', data: 'pdf-data' });

      const url = service.generatePresignedUrl('my-bucket', 'secret.pdf', 3600);

      expect(url).toContain('my-bucket');
      expect(url).toContain('secret.pdf');
      expect(url).toContain('token=');
      expect(url).toContain('expires=');
    });

    it('throws if object does not exist', () => {
      service.createBucket(defaultBucket);

      expect(() => service.generatePresignedUrl('my-bucket', 'missing.txt', 3600)).toThrow(
        'Object not found',
      );
    });
  });

  describe('getStorageMetrics', () => {
    it('returns metrics for a bucket', () => {
      service.createBucket(defaultBucket);
      service.putObject({ bucket: 'my-bucket', key: 'file.txt', data: 'hello world' });

      const metrics = service.getStorageMetrics('my-bucket');

      expect(metrics.bucket).toBe('my-bucket');
      expect(metrics.objectCount).toBe(1);
      expect(metrics.totalSize).toBeGreaterThan(0);
      expect(metrics.timestamp).toBeInstanceOf(Date);
    });
  });
});
