import { DailySummary, HealthGoals, MetricType } from '../types.js';
import { HealthStore } from '../store/health-store.js';

export class DailySummaryGenerator {
  constructor(private store: HealthStore) {}

  generate(date: string): DailySummary {
    const start = new Date(date).getTime();
    const end = start + 86400000;
    const hrMetrics = this.store.getMetrics(MetricType.heartRate, start, end);
    const hrValues = hrMetrics.map((m) => m.value);
    const avgHr = hrValues.length ? hrValues.reduce((a, b) => a + b, 0) / hrValues.length : 0;
    const minHr = hrValues.length ? Math.min(...hrValues) : 0;
    const maxHr = hrValues.length ? Math.max(...hrValues) : 0;

    return {
      date,
      steps: this.store.getDailyAggregate(MetricType.steps, date),
      sleepHours: this.store.getDailyAggregate(MetricType.sleep, date),
      sleepQuality: 75,
      avgHeartRate: Math.round(avgHr),
      minHeartRate: minHr,
      maxHeartRate: maxHr,
      activeMinutes: Math.round(this.store.getDailyAggregate(MetricType.calories, date) / 5),
      caloriesBurned: this.store.getDailyAggregate(MetricType.calories, date),
      goalCompletion: 0,
    };
  }

  compareToGoals(summary: DailySummary, goals: HealthGoals): number {
    const stepsPct = Math.min(summary.steps / goals.dailySteps, 1);
    const sleepPct = Math.min(summary.sleepHours / goals.sleepHours, 1);
    const activePct = Math.min(summary.activeMinutes / goals.activeMinutes, 1);
    const calPct = Math.min(summary.caloriesBurned / goals.calories, 1);
    return Math.round(((stepsPct + sleepPct + activePct + calPct) / 4) * 100);
  }

  formatSummary(summary: DailySummary, language: 'en' | 'hi'): string {
    if (language === 'hi') {
      return `${summary.date}: ${summary.steps} कदम, ${summary.sleepHours} घंटे नींद, हृदय गति ${summary.avgHeartRate} bpm, ${summary.caloriesBurned} कैलोरी`;
    }
    return `${summary.date}: ${summary.steps} steps, ${summary.sleepHours}h sleep, HR ${summary.avgHeartRate} bpm, ${summary.caloriesBurned} cal burned`;
  }
}
