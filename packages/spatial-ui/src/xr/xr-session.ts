import type { SpatialDevice, XRSessionConfig, XRSessionState } from '../types.js';

const DEF: SpatialDevice = {
  id: 'default',
  name: 'Generic XR Device',
  type: 'generic',
  capabilities: ['hand-tracking', 'spatial-audio'],
};

interface SessionData {
  config: XRSessionConfig;
  state: XRSessionState;
  negotiatedFeatures: string[];
  frameCallbacks: Array<(time: number) => void>;
}

type SessionEvent = 'stateChange' | 'featureChange' | 'handoff';

export class XRSessionManager {
  private sessions = new Map<string, SessionData>();
  private devices = new Map<string, SpatialDevice>([['default', DEF]]);
  private eventListeners = new Map<SessionEvent, Array<(data: unknown) => void>>();

  startSession(config: XRSessionConfig): string {
    const id = `xr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const available = this.devices.get('default')?.capabilities ?? [];
    const negotiated = config.features.filter((f) => available.includes(f));
    this.sessions.set(id, {
      config,
      state: 'requesting',
      negotiatedFeatures: negotiated,
      frameCallbacks: [],
    });
    this.transitionState(id, 'active');
    return id;
  }

  getSessionState(id: string): XRSessionState | null {
    return this.sessions.get(id)?.state ?? null;
  }

  suspendSession(id: string): boolean {
    const session = this.sessions.get(id);
    if (!session || session.state !== 'active') return false;
    this.transitionState(id, 'suspended');
    return true;
  }

  resumeSession(id: string): boolean {
    const session = this.sessions.get(id);
    if (!session || session.state !== 'suspended') return false;
    this.transitionState(id, 'active');
    return true;
  }

  endSession(id: string): boolean {
    const session = this.sessions.get(id);
    if (!session || session.state === 'ended') return false;
    this.transitionState(id, 'ended');
    return true;
  }

  getNegotiatedFeatures(id: string): string[] {
    return this.sessions.get(id)?.negotiatedFeatures ?? [];
  }

  requestAnimationFrame(id: string, callback: (time: number) => void): boolean {
    const session = this.sessions.get(id);
    if (!session || session.state !== 'active') return false;
    session.frameCallbacks.push(callback);
    return true;
  }

  runFrame(id: string, time: number): number {
    const session = this.sessions.get(id);
    if (!session || session.state !== 'active') return 0;
    const cbs = session.frameCallbacks.splice(0);
    for (const cb of cbs) cb(time);
    return cbs.length;
  }

  handoffSession(fromId: string, toDeviceId: string): string | null {
    const session = this.sessions.get(fromId);
    if (!session || session.state === 'ended') return null;
    if (!this.devices.has(toDeviceId) && toDeviceId !== 'default') return null;
    this.transitionState(fromId, 'ended');
    const newId = this.startSession(session.config);
    this.emit('handoff', { from: fromId, to: newId, device: toDeviceId });
    return newId;
  }

  on(event: SessionEvent, handler: (data: unknown) => void): void {
    const list = this.eventListeners.get(event) ?? [];
    list.push(handler);
    this.eventListeners.set(event, list);
  }

  getDeviceCaps(deviceId: string): SpatialDevice | null {
    return this.devices.get(deviceId) ?? null;
  }

  registerDevice(device: SpatialDevice): void {
    this.devices.set(device.id, device);
  }

  private transitionState(id: string, newState: XRSessionState): void {
    const session = this.sessions.get(id);
    if (!session) return;
    session.state = newState;
    this.emit('stateChange', { id, state: newState });
  }

  private emit(event: SessionEvent, data: unknown): void {
    const handlers = this.eventListeners.get(event) ?? [];
    for (const h of handlers) h(data);
  }
}
