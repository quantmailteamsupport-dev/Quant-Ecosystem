import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { createAppError } from '@quant/server-core';

export interface Activity {
  id: string;
  userId: string;
  type: string;
  duration: number;
  calories: number;
  timestamp: Date;
}

export interface StepData {
  userId: string;
  date: string;
  steps: number;
  goal: number;
  distance: number;
}

export interface Workout {
  id: string;
  userId: string;
  type: string;
  status: 'active' | 'completed' | 'cancelled';
  startedAt: Date;
  endedAt: Date | null;
  duration: number;
  caloriesBurned: number;
  heartRateAvg: number | null;
  heartRateMax: number | null;
}

export interface WorkoutMetrics {
  caloriesBurned: number;
  heartRateAvg?: number;
  heartRateMax?: number;
}

export const LogActivitySchema = z.object({
  type: z.string().min(1),
  duration: z.number().positive(),
  calories: z.number().nonnegative(),
});

export type LogActivityInput = z.infer<typeof LogActivitySchema>;

export const StartWorkoutSchema = z.object({
  type: z.string().min(1),
});

export const EndWorkoutSchema = z.object({
  caloriesBurned: z.number().nonnegative(),
  heartRateAvg: z.number().positive().optional(),
  heartRateMax: z.number().positive().optional(),
});

export type EndWorkoutInput = z.infer<typeof EndWorkoutSchema>;

export const GetWorkoutsFilterSchema = z.object({
  type: z.string().optional(),
  status: z.enum(['active', 'completed', 'cancelled']).optional(),
  limit: z.number().int().positive().optional(),
});

export type GetWorkoutsFilter = z.infer<typeof GetWorkoutsFilterSchema>;

export class ActivityTrackerService {
  private readonly activities = new Map<string, Activity>();
  private readonly workouts = new Map<string, Workout>();
  private readonly steps = new Map<string, StepData>();

  logActivity(userId: string, type: string, duration: number, calories: number): Activity {
    const parsed = LogActivitySchema.parse({ type, duration, calories });

    const activity: Activity = {
      id: randomUUID(),
      userId,
      type: parsed.type,
      duration: parsed.duration,
      calories: parsed.calories,
      timestamp: new Date(),
    };

    this.activities.set(activity.id, activity);
    return activity;
  }

  getSteps(userId: string, date: string): StepData {
    const key = `${userId}:${date}`;
    const existing = this.steps.get(key);
    if (existing) return existing;

    const stepData: StepData = {
      userId,
      date,
      steps: 0,
      goal: 10000,
      distance: 0,
    };

    this.steps.set(key, stepData);
    return stepData;
  }

  startWorkout(userId: string, type: string): Workout {
    StartWorkoutSchema.parse({ type });

    const workout: Workout = {
      id: randomUUID(),
      userId,
      type,
      status: 'active',
      startedAt: new Date(),
      endedAt: null,
      duration: 0,
      caloriesBurned: 0,
      heartRateAvg: null,
      heartRateMax: null,
    };

    this.workouts.set(workout.id, workout);
    return workout;
  }

  endWorkout(workoutId: string, metrics: EndWorkoutInput): Workout {
    const workout = this.workouts.get(workoutId);
    if (!workout) {
      throw createAppError('Workout not found', 404, 'WORKOUT_NOT_FOUND');
    }

    if (workout.status !== 'active') {
      throw createAppError('Workout is not active', 400, 'WORKOUT_NOT_ACTIVE');
    }

    const parsed = EndWorkoutSchema.parse(metrics);
    const endedAt = new Date();
    const duration = Math.round((endedAt.getTime() - workout.startedAt.getTime()) / 1000);

    workout.status = 'completed';
    workout.endedAt = endedAt;
    workout.duration = duration;
    workout.caloriesBurned = parsed.caloriesBurned;
    workout.heartRateAvg = parsed.heartRateAvg ?? null;
    workout.heartRateMax = parsed.heartRateMax ?? null;

    return workout;
  }

  getWorkouts(userId: string, filters?: GetWorkoutsFilter): Workout[] {
    const parsed = filters ? GetWorkoutsFilterSchema.parse(filters) : undefined;
    let results: Workout[] = [];

    for (const workout of this.workouts.values()) {
      if (workout.userId === userId) {
        results.push(workout);
      }
    }

    if (parsed?.type) {
      results = results.filter((w) => w.type === parsed.type);
    }

    if (parsed?.status) {
      results = results.filter((w) => w.status === parsed.status);
    }

    if (parsed?.limit) {
      results = results.slice(0, parsed.limit);
    }

    return results;
  }

  getActivityHistory(userId: string, period: string): Activity[] {
    const days = period === 'week' ? 7 : period === 'month' ? 30 : 90;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const results: Activity[] = [];
    for (const activity of this.activities.values()) {
      if (activity.userId === userId && activity.timestamp >= cutoff) {
        results.push(activity);
      }
    }

    return results;
  }

  getCaloriesBurned(userId: string, date: string): number {
    let total = 0;
    const targetDate = date.split('T')[0] ?? date;

    for (const activity of this.activities.values()) {
      if (activity.userId === userId) {
        const activityDate = activity.timestamp.toISOString().split('T')[0];
        if (activityDate === targetDate) {
          total += activity.calories;
        }
      }
    }

    for (const workout of this.workouts.values()) {
      if (workout.userId === userId && workout.status === 'completed') {
        const workoutDate = workout.startedAt.toISOString().split('T')[0];
        if (workoutDate === targetDate) {
          total += workout.caloriesBurned;
        }
      }
    }

    return total;
  }

  getActiveMinutes(userId: string, date: string): number {
    let total = 0;
    const targetDate = date.split('T')[0] ?? date;

    for (const activity of this.activities.values()) {
      if (activity.userId === userId) {
        const activityDate = activity.timestamp.toISOString().split('T')[0];
        if (activityDate === targetDate) {
          total += activity.duration;
        }
      }
    }

    for (const workout of this.workouts.values()) {
      if (workout.userId === userId && workout.status === 'completed') {
        const workoutDate = workout.startedAt.toISOString().split('T')[0];
        if (workoutDate === targetDate) {
          total += Math.round(workout.duration / 60);
        }
      }
    }

    return total;
  }
}
