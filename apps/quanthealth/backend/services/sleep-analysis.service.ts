import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { createAppError } from '@quant/server-core';

export interface SleepRecord {
  id: string;
  userId: string;
  startTime: Date;
  endTime: Date;
  quality: number;
  duration: number;
  createdAt: Date;
}

export interface SleepScore {
  userId: string;
  score: number;
  quality: 'poor' | 'fair' | 'good' | 'excellent';
  duration: number;
  efficiency: number;
  updatedAt: Date;
}

export interface SleepPattern {
  userId: string;
  period: string;
  averageDuration: number;
  averageQuality: number;
  consistency: number;
  bedtimeRange: { earliest: string; latest: string };
  wakeTimeRange: { earliest: string; latest: string };
}

export interface SleepStage {
  id: string;
  recordId: string;
  stage: 'awake' | 'light' | 'deep' | 'rem';
  startMinute: number;
  endMinute: number;
  duration: number;
}

export interface SleepRecommendation {
  id: string;
  userId: string;
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
}

export interface SleepGoal {
  id: string;
  userId: string;
  targetHours: number;
  createdAt: Date;
}

export const LogSleepSchema = z.object({
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  quality: z.number().int().min(1).max(10),
});

export type LogSleepInput = z.infer<typeof LogSleepSchema>;

export const SetSleepGoalSchema = z.object({
  targetHours: z.number().min(4).max(12),
});

export class SleepAnalysisService {
  private readonly records = new Map<string, SleepRecord>();
  private readonly goals = new Map<string, SleepGoal>();

  logSleep(userId: string, startTime: string, endTime: string, quality: number): SleepRecord {
    const parsed = LogSleepSchema.parse({ startTime, endTime, quality });

    const start = new Date(parsed.startTime);
    const end = new Date(parsed.endTime);
    const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

    if (duration <= 0) {
      throw createAppError('End time must be after start time', 400, 'INVALID_SLEEP_TIMES');
    }

    const record: SleepRecord = {
      id: randomUUID(),
      userId,
      startTime: start,
      endTime: end,
      quality: parsed.quality,
      duration,
      createdAt: new Date(),
    };

    this.records.set(record.id, record);
    return record;
  }

  getSleepScore(userId: string): SleepScore {
    const userRecords = this.getUserRecords(userId);

    if (userRecords.length === 0) {
      return {
        userId,
        score: 0,
        quality: 'poor',
        duration: 0,
        efficiency: 0,
        updatedAt: new Date(),
      };
    }

    const avgQuality = userRecords.reduce((sum, r) => sum + r.quality, 0) / userRecords.length;
    const avgDuration = userRecords.reduce((sum, r) => sum + r.duration, 0) / userRecords.length;
    const score = Math.round((avgQuality / 10) * 50 + Math.min(avgDuration / 8, 1) * 50);

    let quality: SleepScore['quality'];
    if (score >= 85) quality = 'excellent';
    else if (score >= 70) quality = 'good';
    else if (score >= 50) quality = 'fair';
    else quality = 'poor';

    return {
      userId,
      score,
      quality,
      duration: avgDuration,
      efficiency: Math.round((avgDuration / 8) * 100),
      updatedAt: new Date(),
    };
  }

  getSleepPatterns(userId: string, period: string): SleepPattern {
    const userRecords = this.getUserRecords(userId);
    const avgDuration =
      userRecords.length > 0
        ? userRecords.reduce((sum, r) => sum + r.duration, 0) / userRecords.length
        : 0;
    const avgQuality =
      userRecords.length > 0
        ? userRecords.reduce((sum, r) => sum + r.quality, 0) / userRecords.length
        : 0;

    return {
      userId,
      period,
      averageDuration: Math.round(avgDuration * 10) / 10,
      averageQuality: Math.round(avgQuality * 10) / 10,
      consistency: 75,
      bedtimeRange: { earliest: '22:00', latest: '23:30' },
      wakeTimeRange: { earliest: '06:00', latest: '07:30' },
    };
  }

  getSleepStages(recordId: string): SleepStage[] {
    const record = this.records.get(recordId);
    if (!record) {
      throw createAppError('Sleep record not found', 404, 'RECORD_NOT_FOUND');
    }

    const totalMinutes = Math.round(record.duration * 60);
    const stages: SleepStage[] = [
      {
        id: randomUUID(),
        recordId,
        stage: 'light',
        startMinute: 0,
        endMinute: Math.round(totalMinutes * 0.15),
        duration: Math.round(totalMinutes * 0.15),
      },
      {
        id: randomUUID(),
        recordId,
        stage: 'deep',
        startMinute: Math.round(totalMinutes * 0.15),
        endMinute: Math.round(totalMinutes * 0.4),
        duration: Math.round(totalMinutes * 0.25),
      },
      {
        id: randomUUID(),
        recordId,
        stage: 'rem',
        startMinute: Math.round(totalMinutes * 0.4),
        endMinute: Math.round(totalMinutes * 0.6),
        duration: Math.round(totalMinutes * 0.2),
      },
      {
        id: randomUUID(),
        recordId,
        stage: 'light',
        startMinute: Math.round(totalMinutes * 0.6),
        endMinute: Math.round(totalMinutes * 0.8),
        duration: Math.round(totalMinutes * 0.2),
      },
      {
        id: randomUUID(),
        recordId,
        stage: 'rem',
        startMinute: Math.round(totalMinutes * 0.8),
        endMinute: totalMinutes,
        duration: Math.round(totalMinutes * 0.2),
      },
    ];

    return stages;
  }

  getRecommendations(userId: string): SleepRecommendation[] {
    const score = this.getSleepScore(userId);

    const recommendations: SleepRecommendation[] = [
      {
        id: randomUUID(),
        userId,
        title: 'Maintain consistent bedtime',
        description: 'Go to bed and wake up at the same time every day.',
        category: 'schedule',
        priority: 'high',
      },
      {
        id: randomUUID(),
        userId,
        title: 'Limit screen time before bed',
        description: 'Avoid screens 30 minutes before sleep.',
        category: 'habits',
        priority: 'medium',
      },
    ];

    if (score.score < 70) {
      recommendations.push({
        id: randomUUID(),
        userId,
        title: 'Increase sleep duration',
        description: 'Aim for at least 7-8 hours of sleep per night.',
        category: 'duration',
        priority: 'high',
      });
    }

    return recommendations;
  }

  setSleepGoal(userId: string, targetHours: number): SleepGoal {
    SetSleepGoalSchema.parse({ targetHours });

    const goal: SleepGoal = {
      id: randomUUID(),
      userId,
      targetHours,
      createdAt: new Date(),
    };

    this.goals.set(userId, goal);
    return goal;
  }

  private getUserRecords(userId: string): SleepRecord[] {
    const records: SleepRecord[] = [];
    for (const record of this.records.values()) {
      if (record.userId === userId) {
        records.push(record);
      }
    }
    return records;
  }
}
