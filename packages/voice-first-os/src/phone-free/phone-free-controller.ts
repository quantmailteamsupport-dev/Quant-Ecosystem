import type { PhoneFreeConfig } from '../types.js';

export class PhoneFreeController {
  private config: PhoneFreeConfig = {
    screenOff: false,
    allowedCommands: [],
    audioOutput: 'speaker',
    sessionTimeoutMs: 300000,
    sessionStartedAt: null,
  };

  activate(): void {
    this.config.screenOff = true;
    this.config.sessionStartedAt = Date.now();
  }

  deactivate(): void {
    this.config.screenOff = false;
    this.config.sessionStartedAt = null;
  }

  isActive(): boolean {
    return this.config.screenOff;
  }

  setAllowedCommands(commands: string[]): void {
    this.config.allowedCommands = [...commands];
  }

  addAllowedCommand(command: string): void {
    if (!this.config.allowedCommands.includes(command)) {
      this.config.allowedCommands.push(command);
    }
  }

  isCommandAllowed(command: string): boolean {
    if (!this.config.screenOff) return true;
    return this.config.allowedCommands.includes(command);
  }

  setAudioOutput(output: 'speaker' | 'bluetooth' | 'watch'): void {
    this.config.audioOutput = output;
  }

  getAudioOutput(): 'speaker' | 'bluetooth' | 'watch' {
    return this.config.audioOutput;
  }

  setSessionTimeout(ms: number): void {
    this.config.sessionTimeoutMs = ms;
  }

  isSessionExpired(): boolean {
    if (!this.config.sessionStartedAt) return false;
    return Date.now() - this.config.sessionStartedAt >= this.config.sessionTimeoutMs;
  }

  getSessionDuration(): number {
    if (!this.config.sessionStartedAt) return 0;
    return Date.now() - this.config.sessionStartedAt;
  }

  getRemainingTime(): number {
    if (!this.config.sessionStartedAt) return 0;
    const elapsed = Date.now() - this.config.sessionStartedAt;
    return Math.max(0, this.config.sessionTimeoutMs - elapsed);
  }
}
