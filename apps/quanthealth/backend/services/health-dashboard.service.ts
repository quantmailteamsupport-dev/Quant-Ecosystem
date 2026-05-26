import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { createAppError } from '@quant/server-core';

export interface HealthMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
}

export interface HealthDashboard {
  userId: string;
  score: number;
  metrics: HealthMetric[];
  lastUpdated: Date;
}

export interface HealthScore {
  userId: string;
  overall: number;
  components: {
    activity: number;
    sleep: number;
    nutrition: number;
    heartHealth: number;
  };
  updatedAt: Date;
}

export interface HealthInsight {
  id: string;
  userId: string;
  category: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
}

export interface TrendData {
  userId: string;
  period: string;
  dataPoints: { date: string; value: number }[];
  trend: 'improving' | 'declining' | 'stable';
}

export interface HealthGoal {
  id: string;
  userId: string;
  type: string;
  target: number;
  current: number;
  unit: string;
  deadline: Date;
  createdAt: Date;
}

export interface GoalProgress {
  goalId: string;
  type: string;
  target: number;
  current: number;
  percentage: number;
  onTrack: boolean;
}

export interface HealthReport {
  id: string;
  userId: string;
  period: string;
  summary: string;
  score: number;
  recommendations: string[];
  generatedAt: Date;
}

export const SetHealthGoalSchema = z.object({
  type: z.string().min(1),
  target: z.number().positive(),
  unit: z.string().min(1),
  deadline: z.string().min(1),
});

export type SetHealthGoalInput = z.infer<typeof SetHealthGoalSchema>;

export class HealthDashboardService {
  private readonly goals = new Map<string, HealthGoal>();
  private readonly insights = new Map<string, HealthInsight[]>();

  getDashboard(userId: string): HealthDashboard {
    return {
      userId,
      score: this.calculateScore(userId),
      metrics: [
        { name: 'heart_rate', value: 72, unit: 'bpm', timestamp: new Date() },
        { name: 'steps', value: 8500, unit: 'steps', timestamp: new Date() },
        { name: 'calories', value: 2100, unit: 'kcal', timestamp: new Date() },
        { name: 'sleep', value: 7.5, unit: 'hours', timestamp: new Date() },
      ],
      lastUpdated: new Date(),
    };
  }

  getHealthScore(userId: string): HealthScore {
    return {
      userId,
      overall: this.calculateScore(userId),
      components: {
        activity: 78,
        sleep: 82,
        nutrition: 71,
        heartHealth: 88,
      },
      updatedAt: new Date(),
    };
  }

  getInsights(userId: string): HealthInsight[] {
    const userInsights = this.insights.get(userId);
    if (userInsights) return userInsights;

    const defaultInsights: HealthInsight[] = [
      {
        id: randomUUID(),
        userId,
        category: 'activity',
        title: 'Increase daily steps',
        description: 'You are averaging 7,000 steps. Try to reach 10,000.',
        priority: 'medium',
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        userId,
        category: 'sleep',
        title: 'Improve sleep consistency',
        description: 'Your sleep schedule varies by 2 hours. Aim for consistency.',
        priority: 'high',
        createdAt: new Date(),
      },
    ];

    this.insights.set(userId, defaultInsights);
    return defaultInsights;
  }

  getHealthTrends(userId: string, period: string): TrendData {
    const days = period === 'week' ? 7 : period === 'month' ? 30 : 90;
    const dataPoints: { date: string; value: number }[] = [];

    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (days - i - 1));
      dataPoints.push({
        date: date.toISOString().split('T')[0] ?? '',
        value: 70 + Math.floor(Math.random() * 20),
      });
    }

    return {
      userId,
      period,
      dataPoints,
      trend: 'improving',
    };
  }

  setHealthGoal(userId: string, input: SetHealthGoalInput): HealthGoal {
    const parsed = SetHealthGoalSchema.parse(input);

    const goal: HealthGoal = {
      id: randomUUID(),
      userId,
      type: parsed.type,
      target: parsed.target,
      current: 0,
      unit: parsed.unit,
      deadline: new Date(parsed.deadline),
      createdAt: new Date(),
    };

    this.goals.set(goal.id, goal);
    return goal;
  }

  getGoalProgress(userId: string): GoalProgress[] {
    const progress: GoalProgress[] = [];

    for (const goal of this.goals.values()) {
      if (goal.userId === userId) {
        const percentage = goal.target > 0 ? Math.round((goal.current / goal.target) * 100) : 0;
        progress.push({
          goalId: goal.id,
          type: goal.type,
          target: goal.target,
          current: goal.current,
          percentage,
          onTrack: percentage >= 50,
        });
      }
    }

    return progress;
  }

  generateReport(userId: string, period: string): HealthReport {
    if (!userId) {
      throw createAppError('User ID is required', 400, 'VALIDATION_ERROR');
    }

    return {
      id: randomUUID(),
      userId,
      period,
      summary: `Health report for ${period} period. Overall health is good with room for improvement in activity levels.`,
      score: this.calculateScore(userId),
      recommendations: [
        'Increase daily step count to 10,000',
        'Maintain consistent sleep schedule',
        'Add more vegetables to diet',
        'Schedule annual checkup',
      ],
      generatedAt: new Date(),
    };
  }

  private calculateScore(_userId: string): number {
    return 79;
  }
}
