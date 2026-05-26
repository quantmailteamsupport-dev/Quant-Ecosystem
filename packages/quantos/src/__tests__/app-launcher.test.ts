import { describe, it, expect, beforeEach } from 'vitest';
import { AppLauncher } from '../core/app-launcher';

describe('AppLauncher', () => {
  let launcher: AppLauncher;

  beforeEach(() => {
    launcher = new AppLauncher();
  });

  describe('installApp', () => {
    it('should install an app', () => {
      const app = launcher.installApp('editor', 'Code Editor', 'editor-icon');

      expect(app.appId).toBe('editor');
      expect(app.name).toBe('Code Editor');
      expect(app.icon).toBe('editor-icon');
      expect(app.installedAt).toBeGreaterThan(0);
    });

    it('should throw if app already installed', () => {
      launcher.installApp('editor', 'Code Editor', 'editor-icon');

      expect(() => launcher.installApp('editor', 'Editor 2', 'icon')).toThrow(
        'App already installed',
      );
    });

    it('should throw on empty appId', () => {
      expect(() => launcher.installApp('', 'Name', 'icon')).toThrow();
    });
  });

  describe('uninstallApp', () => {
    it('should uninstall an app', () => {
      launcher.installApp('editor', 'Code Editor', 'editor-icon');
      launcher.uninstallApp('editor');

      expect(launcher.listInstalledApps()).toHaveLength(0);
    });

    it('should close running instances on uninstall', () => {
      launcher.installApp('editor', 'Code Editor', 'editor-icon');
      launcher.launchApp({ appId: 'editor', name: 'Code Editor', icon: 'editor-icon' });

      launcher.uninstallApp('editor');

      expect(launcher.listRunningApps()).toHaveLength(0);
    });

    it('should throw if app not installed', () => {
      expect(() => launcher.uninstallApp('nonexistent')).toThrow('App not installed');
    });
  });

  describe('listInstalledApps', () => {
    it('should list all installed apps', () => {
      launcher.installApp('editor', 'Editor', 'icon1');
      launcher.installApp('browser', 'Browser', 'icon2');

      const apps = launcher.listInstalledApps();
      expect(apps).toHaveLength(2);
    });

    it('should return empty array when none installed', () => {
      expect(launcher.listInstalledApps()).toHaveLength(0);
    });
  });

  describe('launchApp', () => {
    it('should launch an installed app', () => {
      launcher.installApp('editor', 'Code Editor', 'editor-icon');

      const instance = launcher.launchApp({
        appId: 'editor',
        name: 'Code Editor',
        icon: 'editor-icon',
      });

      expect(instance.id).toBeTruthy();
      expect(instance.appId).toBe('editor');
      expect(instance.name).toBe('Code Editor');
      expect(instance.state).toBe('running');
      expect(instance.launchedAt).toBeGreaterThan(0);
    });

    it('should throw if app is not installed', () => {
      expect(() => launcher.launchApp({ appId: 'nonexistent', name: 'App', icon: 'icon' })).toThrow(
        'App not installed',
      );
    });

    it('should allow multiple instances of same app', () => {
      launcher.installApp('editor', 'Code Editor', 'icon');

      launcher.launchApp({ appId: 'editor', name: 'Editor 1', icon: 'icon' });
      launcher.launchApp({ appId: 'editor', name: 'Editor 2', icon: 'icon' });

      expect(launcher.listRunningApps()).toHaveLength(2);
    });
  });

  describe('closeApp', () => {
    it('should close a running app instance', () => {
      launcher.installApp('editor', 'Code Editor', 'icon');
      const instance = launcher.launchApp({ appId: 'editor', name: 'Editor', icon: 'icon' });

      launcher.closeApp(instance.id);
      expect(launcher.listRunningApps()).toHaveLength(0);
    });

    it('should throw for non-existent instance', () => {
      expect(() => launcher.closeApp('nonexistent')).toThrow('App instance not found');
    });
  });

  describe('listRunningApps', () => {
    it('should list only running apps', () => {
      launcher.installApp('editor', 'Editor', 'icon1');
      launcher.installApp('browser', 'Browser', 'icon2');

      launcher.launchApp({ appId: 'editor', name: 'Editor', icon: 'icon1' });
      launcher.launchApp({ appId: 'browser', name: 'Browser', icon: 'icon2' });

      expect(launcher.listRunningApps()).toHaveLength(2);
    });
  });

  describe('getAppState', () => {
    it('should return app instance state', () => {
      launcher.installApp('editor', 'Editor', 'icon');
      const instance = launcher.launchApp({ appId: 'editor', name: 'Editor', icon: 'icon' });

      const state = launcher.getAppState(instance.id);
      expect(state.state).toBe('running');
      expect(state.appId).toBe('editor');
    });

    it('should throw for non-existent instance', () => {
      expect(() => launcher.getAppState('nonexistent')).toThrow('App instance not found');
    });
  });

  describe('focusApp', () => {
    it('should focus an app instance', () => {
      launcher.installApp('editor', 'Editor', 'icon');
      const instance = launcher.launchApp({ appId: 'editor', name: 'Editor', icon: 'icon' });

      launcher.focusApp(instance.id);
      const state = launcher.getAppState(instance.id);
      expect(state.state).toBe('running');
    });

    it('should throw for non-existent instance', () => {
      expect(() => launcher.focusApp('nonexistent')).toThrow('App instance not found');
    });
  });
});
