import type { PrivacyConfig } from '../types.js';

export class PrivacyController {
  private config: PrivacyConfig = {
    recordingConsent: false,
    dataRetentionDays: 30,
    privacyLampOn: false,
    muteZones: [],
    appPermissions: new Map(),
  };
  private currentZone: string | null = null;

  grantConsent(): void {
    this.config.recordingConsent = true;
  }

  revokeConsent(): void {
    this.config.recordingConsent = false;
    this.config.privacyLampOn = false;
  }

  hasConsent(): boolean {
    return this.config.recordingConsent;
  }

  setDataRetention(days: number): void {
    this.config.dataRetentionDays = days;
  }

  getDataRetention(): number {
    return this.config.dataRetentionDays;
  }

  isPrivacyLampOn(): boolean {
    return this.config.privacyLampOn;
  }

  startRecording(): boolean {
    if (!this.config.recordingConsent) return false;
    if (this.isInMuteZone()) return false;
    this.config.privacyLampOn = true;
    return true;
  }

  stopRecording(): void {
    this.config.privacyLampOn = false;
  }

  addMuteZone(zone: string): void {
    if (!this.config.muteZones.includes(zone)) {
      this.config.muteZones.push(zone);
    }
  }

  removeMuteZone(zone: string): void {
    this.config.muteZones = this.config.muteZones.filter((z) => z !== zone);
  }

  getMuteZones(): string[] {
    return [...this.config.muteZones];
  }

  enterZone(zone: string): void {
    this.currentZone = zone;
    if (this.isInMuteZone()) {
      this.stopRecording();
    }
  }

  leaveZone(): void {
    this.currentZone = null;
  }

  isInMuteZone(): boolean {
    return this.currentZone !== null && this.config.muteZones.includes(this.currentZone);
  }

  setAppPermission(appId: string, allowed: boolean): void {
    this.config.appPermissions.set(appId, allowed);
  }

  getAppPermission(appId: string): boolean {
    return this.config.appPermissions.get(appId) ?? false;
  }

  isAppAllowed(appId: string): boolean {
    if (!this.config.recordingConsent) return false;
    return this.config.appPermissions.get(appId) ?? false;
  }
}
