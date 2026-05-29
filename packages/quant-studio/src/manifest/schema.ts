import { z } from 'zod';
import { Permission } from '../types.js';

const semverRegex = /^\d+\.\d+\.\d+$/;
const nameRegex = /^[a-z0-9][a-z0-9-]*$/;

export const ManifestSchema = z
  .object({
    name: z
      .string()
      .min(1, 'Name is required')
      .regex(nameRegex, 'Name must be alphanumeric with hyphens, starting with alphanumeric'),
    version: z
      .string()
      .min(1, 'Version is required')
      .regex(semverRegex, 'Version must be valid semver (e.g., 1.0.0)'),
    permissions: z.array(z.nativeEnum(Permission)),
    entryPoint: z.string().min(1, 'Entry point is required'),
    assets: z.array(z.string()).min(1, 'At least one asset is required'),
    author: z.string().min(1, 'Author is required'),
    description: z.string().min(1, 'Description is required'),
  })
  .refine((data) => data.assets.includes(data.entryPoint), {
    message: 'Entry point must be listed in assets',
    path: ['entryPoint'],
  });

export type ManifestInput = z.input<typeof ManifestSchema>;
