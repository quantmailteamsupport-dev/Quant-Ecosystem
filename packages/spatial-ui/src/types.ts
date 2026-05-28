export interface SpatialDevice {
  id: string;
  name: string;
  type: 'visionpro' | 'quest3' | 'generic';
  capabilities: string[];
}
export interface XRSessionConfig {
  mode: 'immersive-ar' | 'immersive-vr' | 'inline';
  features: string[];
}
export interface SpatialPanel {
  id: string;
  position: { x: number; y: number; z: number };
  size: { w: number; h: number };
  anchor: 'room' | 'head' | 'hand';
  group?: string;
  focused?: boolean;
}
export interface HandGesture {
  type: 'pinch' | 'grab' | 'point' | 'swipe';
  confidence: number;
  hand: 'left' | 'right';
}
export type XRSessionState = 'requesting' | 'active' | 'suspended' | 'ended';
export interface EyeTrackingData {
  gazePoint: { x: number; y: number; z: number };
  timestamp: number;
  confidence: number;
  targetId: string | null;
}
export interface SpatialAudioSource {
  id: string;
  position: { x: number; y: number; z: number };
  volume: number;
  directional: boolean;
  maxDistance: number;
  tracking: 'panel' | 'user' | 'static';
}
export interface GestureSequence {
  id: string;
  steps: Array<{ type: HandGesture['type']; hand: HandGesture['hand'] }>;
  action: string;
}
export interface SpatialLayout {
  id: string;
  name: string;
  panels: Array<{
    panelId: string;
    position: { x: number; y: number; z: number };
    size: { w: number; h: number };
  }>;
}
