import { EnergyReading } from '../types.js';

const MAX_READINGS = 100_000;

export class EnergyMonitor {
  private readings: EnergyReading[] = [];

  recordReading(reading: EnergyReading): void {
    this.readings.push(reading);
    if (this.readings.length > MAX_READINGS) {
      this.readings = this.readings.slice(this.readings.length - MAX_READINGS);
    }
  }

  getDeviceConsumption(deviceId: string, from: number, to: number): EnergyReading[] {
    return this.readings.filter(
      (r) => r.deviceId === deviceId && r.timestamp >= from && r.timestamp <= to,
    );
  }

  getDailyAggregation(
    deviceId: string,
    date: number,
  ): { totalWattHours: number; avgWatts: number; cost: number } {
    const dayStart = date;
    const dayEnd = date + 86_400_000;
    const readings = this.getDeviceConsumption(deviceId, dayStart, dayEnd);
    return this.aggregate(readings);
  }

  getWeeklyAggregation(
    deviceId: string,
    weekStart: number,
  ): { totalWattHours: number; avgWatts: number; cost: number } {
    const weekEnd = weekStart + 7 * 86_400_000;
    const readings = this.getDeviceConsumption(deviceId, weekStart, weekEnd);
    return this.aggregate(readings);
  }

  getMonthlyCost(deviceId: string, month: number, year: number, costPerKwh: number): number {
    const start = new Date(year, month, 1).getTime();
    const end = new Date(year, month + 1, 1).getTime();
    const readings = this.getDeviceConsumption(deviceId, start, end);
    const totalWh = this.integrateWattHours(readings);
    return (totalWh / 1000) * costPerKwh;
  }

  detectPowerCut(devices: string[], threshold: number): boolean {
    if (devices.length === 0) return false;
    const zeroCount = devices.filter((id) => {
      const latest = this.readings
        .filter((r) => r.deviceId === id)
        .sort((a, b) => b.timestamp - a.timestamp)[0];
      return latest !== undefined && latest.watts === 0;
    }).length;
    return (zeroCount / devices.length) * 100 >= threshold;
  }

  private integrateWattHours(readings: EnergyReading[]): number {
    if (readings.length < 2) return 0;
    const sorted = [...readings].sort((a, b) => a.timestamp - b.timestamp);
    let totalWh = 0;
    for (let i = 1; i < sorted.length; i++) {
      const hours = (sorted[i]!.timestamp - sorted[i - 1]!.timestamp) / 3_600_000;
      totalWh += sorted[i - 1]!.watts * hours;
    }
    return totalWh;
  }

  private aggregate(readings: EnergyReading[]): {
    totalWattHours: number;
    avgWatts: number;
    cost: number;
  } {
    if (readings.length === 0) return { totalWattHours: 0, avgWatts: 0, cost: 0 };
    const totalWatts = readings.reduce((sum, r) => sum + r.watts, 0);
    const avgWatts = totalWatts / readings.length;
    const totalWattHours = this.integrateWattHours(readings);
    const avgCost = readings.reduce((sum, r) => sum + r.costPerKwh, 0) / readings.length;
    const cost = (totalWattHours / 1000) * avgCost;
    return { totalWattHours, avgWatts, cost };
  }
}
