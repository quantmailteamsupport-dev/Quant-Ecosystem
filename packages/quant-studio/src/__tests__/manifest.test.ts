import { describe, it, expect } from 'vitest';
import { ManifestValidator } from '../manifest/validator.js';
import { Permission } from '../types.js';

describe('ManifestValidator', () => {
  const validator = new ManifestValidator();

  function validManifest() {
    return {
      name: 'my-cool-app',
      version: '1.0.0',
      permissions: [Permission.Storage, Permission.Network],
      entryPoint: 'index.html',
      assets: ['index.html', 'app.js', 'style.css'],
      author: 'testuser',
      description: 'A test application',
    };
  }

  it('should validate a correct manifest', () => {
    const result = validator.validate(validManifest());
    expect(result.valid).toBe(true);
    expect(result.manifest).toBeDefined();
    expect(result.errors).toHaveLength(0);
  });

  it('should reject manifest with missing required fields', () => {
    const result = validator.validate({ name: 'test' });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should reject manifest with invalid permission values', () => {
    const manifest = { ...validManifest(), permissions: ['fly', 'teleport'] };
    const result = validator.validate(manifest);
    expect(result.valid).toBe(false);
  });

  it('should reject manifest with non-semver version', () => {
    const manifest = { ...validManifest(), version: 'v1.0' };
    const result = validator.validate(manifest);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('semver'))).toBe(true);
  });

  it('should reject manifest where entry point is not in assets', () => {
    const manifest = { ...validManifest(), entryPoint: 'missing.html' };
    const result = validator.validate(manifest);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('Entry point'))).toBe(true);
  });

  it('should reject manifest with invalid name format', () => {
    const manifest = { ...validManifest(), name: 'My App!' };
    const result = validator.validate(manifest);
    expect(result.valid).toBe(false);
  });
});
