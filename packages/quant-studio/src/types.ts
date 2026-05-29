export enum Permission {
  Camera = 'camera',
  Storage = 'storage',
  Network = 'network',
  AI = 'ai',
  Identity = 'identity',
  Payments = 'payments',
}

export interface QAppManifest {
  name: string;
  version: string;
  permissions: Permission[];
  entryPoint: string;
  assets: string[];
  author: string;
  description: string;
}

export interface QAppBundle {
  manifest: QAppManifest;
  files: BundleFile[];
  totalSize: number;
  createdAt: number;
}

export interface BundleFile {
  path: string;
  content: string;
  size: number;
}

export interface SandboxConfig {
  maxCPU: number;
  maxMemory: number;
  maxNetworkRequests: number;
}

export interface SDKContext {
  appId: string;
  userId: string;
  permissions: Permission[];
}

export interface PublishMetadata {
  appId: string;
  version: string;
  author: string;
  description: string;
  publishedAt: number;
}

export interface RemixInfo {
  originalAppId: string;
  originalAuthor: string;
  remixAuthor: string;
  attributionChain: string[];
  createdAt: number;
}

export interface EarningSplit {
  creator: number;
  remixerChain: number;
  platform: number;
}

export type ProjectType = 'raw' | 'phaser' | 'react' | 'webgl';

export class PermissionDeniedError extends Error {
  constructor(permission: Permission) {
    super(`Permission denied: '${permission}' is not declared in manifest`);
    this.name = 'PermissionDeniedError';
  }
}
