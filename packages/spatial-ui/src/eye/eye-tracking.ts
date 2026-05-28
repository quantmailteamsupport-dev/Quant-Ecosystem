import type { EyeTrackingData } from '../types.js';

interface DwellState {
  targetId: string;
  startedAt: number;
  triggered: boolean;
}

export class EyeTracker {
  private gazeHistory: EyeTrackingData[] = [];
  private dwellState: DwellState | null = null;
  private dwellThresholdMs: number;
  private calibrated = false;
  private heatMap = new Map<string, number>();
  private maxHistorySize = 1000;

  constructor(dwellThresholdMs = 800) {
    this.dwellThresholdMs = dwellThresholdMs;
  }

  calibrate(): void {
    this.calibrated = true;
  }

  isCalibrated(): boolean {
    return this.calibrated;
  }

  trackGaze(data: EyeTrackingData): void {
    this.gazeHistory.push(data);
    if (this.gazeHistory.length > this.maxHistorySize) {
      this.gazeHistory.shift();
    }
    if (data.targetId) {
      const count = this.heatMap.get(data.targetId) ?? 0;
      this.heatMap.set(data.targetId, count + 1);
    }
    this.updateDwell(data);
  }

  private updateDwell(data: EyeTrackingData): void {
    if (!data.targetId) {
      this.dwellState = null;
      return;
    }
    if (!this.dwellState || this.dwellState.targetId !== data.targetId) {
      this.dwellState = { targetId: data.targetId, startedAt: data.timestamp, triggered: false };
    }
  }

  checkDwell(now: number): string | null {
    if (!this.dwellState || this.dwellState.triggered) return null;
    if (now - this.dwellState.startedAt >= this.dwellThresholdMs) {
      this.dwellState.triggered = true;
      return this.dwellState.targetId;
    }
    return null;
  }

  gazeSelect(now: number): string | null {
    return this.checkDwell(now);
  }

  getHeatMap(): Map<string, number> {
    return new Map(this.heatMap);
  }

  getGazeHistory(): EyeTrackingData[] {
    return [...this.gazeHistory];
  }

  isDataLocal(): boolean {
    return true;
  }

  reset(): void {
    this.gazeHistory = [];
    this.dwellState = null;
    this.heatMap.clear();
  }
}
