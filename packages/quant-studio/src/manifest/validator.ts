import { ManifestSchema } from './schema.js';
import type { QAppManifest } from '../types.js';

export interface ValidationResult {
  valid: boolean;
  manifest?: QAppManifest;
  errors: string[];
}

export class ManifestValidator {
  validate(input: unknown): ValidationResult {
    const result = ManifestSchema.safeParse(input);
    if (result.success) {
      return {
        valid: true,
        manifest: result.data as QAppManifest,
        errors: [],
      };
    }
    return {
      valid: false,
      errors: result.error.issues.map((i) => i.message),
    };
  }
}
