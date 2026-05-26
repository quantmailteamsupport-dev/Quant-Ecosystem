// ============================================================================
// QuantOS - App Launcher
// ============================================================================

import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { AppInstance, InstalledApp, LaunchConfig } from '../types';

// ============================================================================
// Validation Schemas
// ============================================================================

export const LaunchConfigSchema = z.object({
  appId: z.string().min(1),
  name: z.string().min(1).max(128),
  icon: z.string().min(1),
  windowConfig: z
    .object({
      position: z.object({ x: z.number(), y: z.number() }).optional(),
      size: z.object({ width: z.number().positive(), height: z.number().positive() }).optional(),
    })
    .optional(),
});

export const InstallAppSchema = z.object({
  appId: z.string().min(1),
  name: z.string().min(1).max(128),
  icon: z.string().min(1),
});

// ============================================================================
// AppLauncher Class
// ============================================================================

export class AppLauncher {
  private instances: Map<string, AppInstance> = new Map();
  private installedApps: Map<string, InstalledApp> = new Map();

  launchApp(config: LaunchConfig): AppInstance {
    const validated = LaunchConfigSchema.parse(config);

    const installed = this.installedApps.get(validated.appId);
    if (!installed) {
      throw new Error(`App not installed: ${validated.appId}`);
    }

    const instance: AppInstance = {
      id: randomUUID(),
      appId: validated.appId,
      name: validated.name,
      icon: validated.icon,
      state: 'running',
      windowId: null,
      launchedAt: Date.now(),
    };

    this.instances.set(instance.id, instance);
    return instance;
  }

  closeApp(instanceId: string): void {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error(`App instance not found: ${instanceId}`);
    }
    instance.state = 'closing';
    this.instances.delete(instanceId);
  }

  listRunningApps(): AppInstance[] {
    return Array.from(this.instances.values()).filter((app) => app.state === 'running');
  }

  getAppState(instanceId: string): AppInstance {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error(`App instance not found: ${instanceId}`);
    }
    return instance;
  }

  focusApp(instanceId: string): void {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error(`App instance not found: ${instanceId}`);
    }
    instance.state = 'running';
  }

  installApp(appId: string, name: string, icon: string): InstalledApp {
    const validated = InstallAppSchema.parse({ appId, name, icon });

    if (this.installedApps.has(validated.appId)) {
      throw new Error(`App already installed: ${validated.appId}`);
    }

    const app: InstalledApp = {
      appId: validated.appId,
      name: validated.name,
      icon: validated.icon,
      installedAt: Date.now(),
    };

    this.installedApps.set(app.appId, app);
    return app;
  }

  uninstallApp(appId: string): void {
    if (!this.installedApps.has(appId)) {
      throw new Error(`App not installed: ${appId}`);
    }

    // Close all running instances of this app
    for (const [id, instance] of this.instances) {
      if (instance.appId === appId) {
        this.instances.delete(id);
      }
    }

    this.installedApps.delete(appId);
  }

  listInstalledApps(): InstalledApp[] {
    return Array.from(this.installedApps.values());
  }
}
