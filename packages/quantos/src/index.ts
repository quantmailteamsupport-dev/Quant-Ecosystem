// ============================================================================
// QuantOS Package - Barrel Export
// Operating system layer for the Quant ecosystem
// ============================================================================

export * from './types';
export { AppLauncher, LaunchConfigSchema, InstallAppSchema } from './core/app-launcher';
export {
  WindowManager,
  CreateWindowSchema,
  MoveWindowSchema,
  ResizeWindowSchema,
} from './core/window-manager';
export { NotificationCenter, PushNotificationSchema } from './core/notification-center';
export { FileSystemAbstraction, CreateFileSchema, MoveFileSchema } from './core/file-system';
export { WidgetSystem, RegisterWidgetSchema, UpdateWidgetDataSchema } from './core/widget-system';
export { WorkspaceManager, CreateWorkspaceSchema } from './core/workspace-manager';
export { ClipboardSync, CopySchema } from './core/clipboard-sync';
export { DeviceIntegration } from './core/device-integration';
