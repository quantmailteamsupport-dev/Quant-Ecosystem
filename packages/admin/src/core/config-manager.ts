// ============================================================================
// Admin & Operations Package - Live Config Manager
// ============================================================================

import type {
  LiveConfig,
  ConfigEntry,
  ConfigVersion,
  ConfigChange,
  ConfigValidationRule,
  EnvironmentConfig,
  SecretConfig,
  ConfigValueType,
} from '../types';

/** Config change subscriber */
interface ConfigSubscriber {
  id: string;
  keys: string[];
  callback: (change: ConfigChange) => void;
}

/** Config diff between environments */
interface EnvironmentDiff {
  onlyInSource: string[];
  onlyInTarget: string[];
  different: Array<{ key: string; sourceValue: unknown; targetValue: unknown }>;
  same: string[];
}

/**
 * LiveConfigManager - Dynamic configuration management service
 * Supports versioned configs, environment-specific values, validation,
 * rollback, change subscriptions, encrypted secrets, and environment diffing.
 */
export class LiveConfigManager {
  private configs: Map<string, Map<string, LiveConfig>> = new Map();
  private versions: Map<string, ConfigVersion[]> = new Map();
  private subscribers: ConfigSubscriber[] = [];
  private secrets: Map<string, SecretConfig> = new Map();
  private changeLog: ConfigChange[] = [];

  /**
   * Set a configuration value with validation and versioning
   */
  public setConfig(
    key: string,
    value: unknown,
    environment: string,
    changedBy: string,
    options?: { reason?: string; type?: ConfigValueType; description?: string; validationRules?: ConfigValidationRule[] }
  ): LiveConfig {
    const type = options?.type || this.inferType(value);

    // Validate the value
    if (options?.validationRules) {
      const validationError = this.validateValue(value, type, options.validationRules);
      if (validationError) {
        throw new Error(`Validation failed for '${key}': ${validationError}`);
      }
    }

    // Get or create environment map
    if (!this.configs.has(environment)) {
      this.configs.set(environment, new Map());
    }
    const envConfigs = this.configs.get(environment)!;

    // Get current version
    const existing = envConfigs.get(key);
    const newVersion = existing ? existing.version + 1 : 1;
    const oldValue = existing?.value;

    // Create new config
    const config: LiveConfig = {
      key,
      value,
      type,
      environment,
      version: newVersion,
      updatedBy: changedBy,
      updatedAt: Date.now(),
      description: options?.description || existing?.description || '',
      validationRules: options?.validationRules || existing?.validationRules,
    };

    envConfigs.set(key, config);

    // Store version history
    const versionKey = `${environment}:${key}`;
    if (!this.versions.has(versionKey)) {
      this.versions.set(versionKey, []);
    }
    this.versions.get(versionKey)!.push({
      version: newVersion,
      key,
      value,
      changedBy,
      changedAt: Date.now(),
      reason: options?.reason || '',
    });

    // Record change
    const change: ConfigChange = {
      id: `cc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      key,
      oldValue,
      newValue: value,
      changedBy,
      timestamp: Date.now(),
      environment,
    };
    this.changeLog.push(change);

    // Notify subscribers
    this.notifySubscribers(change);

    return config;
  }

  /**
   * Get current config value for environment
   */
  public getConfig(key: string, environment: string): LiveConfig | null {
    const envConfigs = this.configs.get(environment);
    if (!envConfigs) return null;
    return envConfigs.get(key) || null;
  }

  /**
   * Get all versions of a config entry
   */
  public getHistory(key: string, environment: string): ConfigVersion[] {
    const versionKey = `${environment}:${key}`;
    return this.versions.get(versionKey) || [];
  }

  /**
   * Rollback to a specific version
   */
  public rollback(key: string, environment: string, targetVersion: number, rolledBackBy: string): LiveConfig {
    const versionKey = `${environment}:${key}`;
    const history = this.versions.get(versionKey);

    if (!history || history.length === 0) {
      throw new Error(`No history found for '${key}' in '${environment}'`);
    }

    const targetEntry = history.find(v => v.version === targetVersion);
    if (!targetEntry) {
      throw new Error(`Version ${targetVersion} not found for '${key}'`);
    }

    return this.setConfig(key, targetEntry.value, environment, rolledBackBy, {
      reason: `Rollback to version ${targetVersion}`,
    });
  }

  /**
   * Validate a config value against type and rules
   */
  public validateConfig(value: unknown, type: ConfigValueType, rules: ConfigValidationRule[]): string | null {
    return this.validateValue(value, type, rules);
  }

  /**
   * Subscribe to config changes for specific keys
   */
  public subscribeToChanges(keys: string[], callback: (change: ConfigChange) => void): string {
    const id = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.subscribers.push({ id, keys, callback });
    return id;
  }

  /**
   * Unsubscribe from config changes
   */
  public unsubscribe(subscriberId: string): void {
    this.subscribers = this.subscribers.filter(s => s.id !== subscriberId);
  }

  /**
   * Store an encrypted secret config value
   */
  public setSecret(key: string, value: string, algorithm: string = 'aes-256-gcm', expiresAt?: number): SecretConfig {
    // Simple obfuscation (in production would use real encryption)
    const encoded = Buffer.from(value).toString('base64');
    const encryptedValue = encoded.split('').reverse().join('');

    const secret: SecretConfig = {
      key,
      encryptedValue,
      algorithm,
      rotatedAt: Date.now(),
      expiresAt,
    };

    this.secrets.set(key, secret);
    return secret;
  }

  /**
   * Retrieve a secret (decrypted)
   */
  public getSecret(key: string): string | null {
    const secret = this.secrets.get(key);
    if (!secret) return null;

    // Check expiration
    if (secret.expiresAt && secret.expiresAt < Date.now()) {
      return null;
    }

    // Simple decryption (reverse of encoding)
    const reversed = secret.encryptedValue.split('').reverse().join('');
    return Buffer.from(reversed, 'base64').toString('utf-8');
  }

  /**
   * Compare configs between two environments
   */
  public compareEnvironments(sourceEnv: string, targetEnv: string): EnvironmentDiff {
    const sourceConfigs = this.configs.get(sourceEnv) || new Map();
    const targetConfigs = this.configs.get(targetEnv) || new Map();

    const onlyInSource: string[] = [];
    const onlyInTarget: string[] = [];
    const different: Array<{ key: string; sourceValue: unknown; targetValue: unknown }> = [];
    const same: string[] = [];

    // Check all source keys
    for (const [key, config] of sourceConfigs) {
      const targetConfig = targetConfigs.get(key);
      if (!targetConfig) {
        onlyInSource.push(key);
      } else if (JSON.stringify(config.value) !== JSON.stringify(targetConfig.value)) {
        different.push({ key, sourceValue: config.value, targetValue: targetConfig.value });
      } else {
        same.push(key);
      }
    }

    // Check keys only in target
    for (const key of targetConfigs.keys()) {
      if (!sourceConfigs.has(key)) {
        onlyInTarget.push(key);
      }
    }

    return { onlyInSource, onlyInTarget, different, same };
  }

  /**
   * Import/export bulk config management
   */
  public importExport(action: 'import' | 'export', environment: string, data?: Record<string, unknown>): Record<string, unknown> | void {
    if (action === 'export') {
      const envConfigs = this.configs.get(environment) || new Map();
      const exported: Record<string, unknown> = {};
      for (const [key, config] of envConfigs) {
        exported[key] = { value: config.value, type: config.type, description: config.description };
      }
      return exported;
    }

    if (action === 'import' && data) {
      for (const [key, entry] of Object.entries(data)) {
        const typedEntry = entry as { value: unknown; type?: ConfigValueType; description?: string };
        this.setConfig(key, typedEntry.value, environment, 'system_import', {
          type: typedEntry.type,
          description: typedEntry.description,
          reason: 'Bulk import',
        });
      }
    }
  }

  /**
   * Get all configs for an environment
   */
  public getEnvironmentConfig(environment: string): EnvironmentConfig {
    const envConfigs = this.configs.get(environment) || new Map();
    return {
      environment,
      configs: Array.from(envConfigs.values()),
      lastSynced: Date.now(),
    };
  }

  /**
   * Notify subscribers of a config change
   */
  private notifySubscribers(change: ConfigChange): void {
    for (const subscriber of this.subscribers) {
      if (subscriber.keys.includes(change.key) || subscriber.keys.includes('*')) {
        try {
          subscriber.callback(change);
        } catch {
          // Subscriber error should not affect config change
        }
      }
    }
  }

  /**
   * Validate a value against rules
   */
  private validateValue(value: unknown, type: ConfigValueType, rules: ConfigValidationRule[]): string | null {
    // Type check
    switch (type) {
      case 'string':
        if (typeof value !== 'string') return 'Expected string value';
        break;
      case 'number':
        if (typeof value !== 'number') return 'Expected number value';
        break;
      case 'boolean':
        if (typeof value !== 'boolean') return 'Expected boolean value';
        break;
      case 'json':
        if (typeof value !== 'object' || value === null) return 'Expected JSON object';
        break;
    }

    // Apply validation rules
    for (const rule of rules) {
      switch (rule.type) {
        case 'range': {
          const numVal = Number(value);
          const min = rule.params.min as number | undefined;
          const max = rule.params.max as number | undefined;
          if (min !== undefined && numVal < min) return `Value must be >= ${min}`;
          if (max !== undefined && numVal > max) return `Value must be <= ${max}`;
          break;
        }
        case 'regex': {
          const pattern = rule.params.pattern as string;
          if (!new RegExp(pattern).test(String(value))) return `Value must match pattern: ${pattern}`;
          break;
        }
        case 'enum': {
          const allowed = rule.params.values as unknown[];
          if (!allowed.includes(value)) return `Value must be one of: ${allowed.join(', ')}`;
          break;
        }
      }
    }

    return null;
  }

  /**
   * Infer config value type from value
   */
  private inferType(value: unknown): ConfigValueType {
    if (typeof value === 'string') return 'string';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    return 'json';
  }
}
