// ============================================================================
// QuantOS Package - Type Definitions
// Operating system layer: windows, workspaces, widgets, notifications, files
// ============================================================================

/** Window state lifecycle */
export type WindowState = 'normal' | 'maximized' | 'minimized' | 'fullscreen';

/** App instance state */
export type AppState = 'launching' | 'running' | 'suspended' | 'closing' | 'crashed';

/** Notification priority levels */
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

/** File node type */
export type FileNodeType = 'file' | 'directory';

/** Clipboard content type */
export type ClipboardContentType = 'text' | 'image' | 'html' | 'file' | 'rich';

/** Device capability type */
export type DeviceCapabilityType =
  | 'camera'
  | 'microphone'
  | 'location'
  | 'biometric'
  | 'bluetooth'
  | 'nfc'
  | 'accelerometer';

/** Widget layout type */
export type WidgetLayoutType = 'grid' | 'freeform' | 'stacked' | 'horizontal' | 'vertical';

/** Tile layout direction */
export type TileLayout = 'horizontal' | 'vertical' | 'grid';

/** Biometric result status */
export type BiometricStatus = 'success' | 'failed' | 'cancelled' | 'not_available';

/** Window position */
export interface WindowPosition {
  x: number;
  y: number;
}

/** Window size */
export interface WindowSize {
  width: number;
  height: number;
}

/** Window configuration for creation */
export interface WindowConfig {
  position?: WindowPosition;
  size?: WindowSize;
  minSize?: WindowSize;
  maxSize?: WindowSize;
  resizable?: boolean;
  draggable?: boolean;
}

/** Window record */
export interface Window {
  id: string;
  title: string;
  position: WindowPosition;
  size: WindowSize;
  state: WindowState;
  zIndex: number;
  appId: string;
  createdAt: number;
}

/** Workspace record */
export interface Workspace {
  id: string;
  name: string;
  windows: string[];
  isActive: boolean;
  createdAt: number;
}

/** Widget configuration */
export interface WidgetConfig {
  title?: string;
  theme?: string;
  refreshInterval?: number;
  [key: string]: unknown;
}

/** Widget record */
export interface Widget {
  id: string;
  type: string;
  position: WindowPosition;
  size: WindowSize;
  config: WidgetConfig;
  data: Record<string, unknown>;
  refreshInterval: number;
  createdAt: number;
}

/** Notification action */
export interface NotificationAction {
  id: string;
  label: string;
  action: string;
}

/** Notification record */
export interface Notification {
  id: string;
  title: string;
  body: string;
  appId: string;
  priority: NotificationPriority;
  timestamp: number;
  read: boolean;
  actions: NotificationAction[];
}

/** File system node */
export interface FileNode {
  id: string;
  name: string;
  path: string;
  type: FileNodeType;
  size: number;
  mimeType: string;
  createdAt: number;
  modifiedAt: number;
}

/** Clipboard item */
export interface ClipboardItem {
  id: string;
  content: string;
  type: ClipboardContentType;
  sourceApp: string;
  timestamp: number;
  synced: boolean;
}

/** Device capability */
export interface DeviceCapability {
  type: DeviceCapabilityType;
  available: boolean;
  permissionGranted: boolean;
}

/** Installed app definition */
export interface InstalledApp {
  appId: string;
  name: string;
  icon: string;
  installedAt: number;
}

/** App instance */
export interface AppInstance {
  id: string;
  appId: string;
  name: string;
  icon: string;
  state: AppState;
  windowId: string | null;
  launchedAt: number;
}

/** Launch configuration */
export interface LaunchConfig {
  appId: string;
  name: string;
  icon: string;
  windowConfig?: WindowConfig;
}

/** Camera stream */
export interface CameraStream {
  id: string;
  active: boolean;
  resolution: { width: number; height: number };
}

/** Microphone stream */
export interface MicrophoneStream {
  id: string;
  active: boolean;
  sampleRate: number;
}

/** Geo location */
export interface GeoLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

/** Biometric result */
export interface BiometricResult {
  status: BiometricStatus;
  method: string;
  timestamp: number;
}

/** Widget registration config */
export interface WidgetRegistrationConfig {
  type: string;
  position?: WindowPosition;
  size?: WindowSize;
  config?: WidgetConfig;
  refreshInterval?: number;
}

/** Widget layout config */
export interface WidgetLayoutConfig {
  layout: WidgetLayoutType;
  gap?: number;
  columns?: number;
}

/** Notification filter options */
export interface NotificationFilter {
  appId?: string;
  priority?: NotificationPriority;
  read?: boolean;
}

/** Push notification input */
export interface PushNotificationInput {
  title: string;
  body: string;
  appId: string;
  priority?: NotificationPriority;
  actions?: NotificationAction[];
}
