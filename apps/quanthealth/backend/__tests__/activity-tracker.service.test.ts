import { describe, it, expect, beforeEach } from 'vitest';
import { ActivityTrackerService } from '../services/activity-tracker.service';

describe('ActivityTrackerService', () => {
  let service: ActivityTrackerService;

  beforeEach(() => {
    service = new ActivityTrackerService();
  });

  describe('logActivity', () => {
    it('logs an activity with generated id and timestamp', () => {
      const activity = service.logActivity('user-1', 'running', 30, 300);

      expect(activity.id).toBeDefined();
      expect(activity.userId).toBe('user-1');
      expect(activity.type).toBe('running');
      expect(activity.duration).toBe(30);
      expect(activity.calories).toBe(300);
      expect(activity.timestamp).toBeInstanceOf(Date);
    });

    it('generates unique ids for multiple activities', () => {
      const a1 = service.logActivity('user-1', 'running', 30, 300);
      const a2 = service.logActivity('user-1', 'cycling', 45, 400);

      expect(a1.id).not.toBe(a2.id);
    });

    it('throws on invalid input', () => {
      expect(() => service.logActivity('user-1', '', 30, 300)).toThrow();
      expect(() => service.logActivity('user-1', 'running', -1, 300)).toThrow();
    });
  });

  describe('getSteps', () => {
    it('returns step data for a user and date', () => {
      const steps = service.getSteps('user-1', '2024-01-15');

      expect(steps.userId).toBe('user-1');
      expect(steps.date).toBe('2024-01-15');
      expect(steps.steps).toBe(0);
      expect(steps.goal).toBe(10000);
    });

    it('returns same data for same user and date', () => {
      const steps1 = service.getSteps('user-1', '2024-01-15');
      const steps2 = service.getSteps('user-1', '2024-01-15');

      expect(steps1).toEqual(steps2);
    });
  });

  describe('workout lifecycle', () => {
    it('starts a workout with active status', () => {
      const workout = service.startWorkout('user-1', 'running');

      expect(workout.id).toBeDefined();
      expect(workout.userId).toBe('user-1');
      expect(workout.type).toBe('running');
      expect(workout.status).toBe('active');
      expect(workout.startedAt).toBeInstanceOf(Date);
      expect(workout.endedAt).toBeNull();
    });

    it('ends a workout and calculates duration', () => {
      const workout = service.startWorkout('user-1', 'cycling');
      const ended = service.endWorkout(workout.id, { caloriesBurned: 500, heartRateAvg: 140 });

      expect(ended.status).toBe('completed');
      expect(ended.endedAt).toBeInstanceOf(Date);
      expect(ended.caloriesBurned).toBe(500);
      expect(ended.heartRateAvg).toBe(140);
      expect(ended.duration).toBeGreaterThanOrEqual(0);
    });

    it('throws when ending a non-existent workout', () => {
      expect(() => service.endWorkout('fake-id', { caloriesBurned: 100 })).toThrow(
        'Workout not found',
      );
    });

    it('throws when ending an already completed workout', () => {
      const workout = service.startWorkout('user-1', 'running');
      service.endWorkout(workout.id, { caloriesBurned: 200 });

      expect(() => service.endWorkout(workout.id, { caloriesBurned: 300 })).toThrow(
        'Workout is not active',
      );
    });

    it('lists workouts for a user', () => {
      service.startWorkout('user-1', 'running');
      service.startWorkout('user-1', 'cycling');
      service.startWorkout('user-2', 'swimming');

      const workouts = service.getWorkouts('user-1');
      expect(workouts).toHaveLength(2);
    });

    it('filters workouts by type', () => {
      service.startWorkout('user-1', 'running');
      service.startWorkout('user-1', 'cycling');

      const workouts = service.getWorkouts('user-1', { type: 'running' });
      expect(workouts).toHaveLength(1);
      expect(workouts[0]!.type).toBe('running');
    });

    it('filters workouts by status', () => {
      const w1 = service.startWorkout('user-1', 'running');
      service.startWorkout('user-1', 'cycling');
      service.endWorkout(w1.id, { caloriesBurned: 200 });

      const completed = service.getWorkouts('user-1', { status: 'completed' });
      expect(completed).toHaveLength(1);
      expect(completed[0]!.status).toBe('completed');
    });
  });

  describe('getCaloriesBurned', () => {
    it('sums calories from activities logged today', () => {
      const today = new Date().toISOString().split('T')[0] ?? '';
      service.logActivity('user-1', 'running', 30, 300);
      service.logActivity('user-1', 'cycling', 45, 400);

      const total = service.getCaloriesBurned('user-1', today);
      expect(total).toBe(700);
    });

    it('includes calories from completed workouts', () => {
      const today = new Date().toISOString().split('T')[0] ?? '';
      service.logActivity('user-1', 'running', 30, 300);
      const workout = service.startWorkout('user-1', 'cycling');
      service.endWorkout(workout.id, { caloriesBurned: 500 });

      const total = service.getCaloriesBurned('user-1', today);
      expect(total).toBe(800);
    });

    it('returns 0 for a date with no activity', () => {
      const total = service.getCaloriesBurned('user-1', '2020-01-01');
      expect(total).toBe(0);
    });
  });

  describe('getActiveMinutes', () => {
    it('sums duration from activities logged today', () => {
      const today = new Date().toISOString().split('T')[0] ?? '';
      service.logActivity('user-1', 'running', 30, 300);
      service.logActivity('user-1', 'cycling', 45, 400);

      const total = service.getActiveMinutes('user-1', today);
      expect(total).toBe(75);
    });

    it('returns 0 for a date with no activity', () => {
      const total = service.getActiveMinutes('user-1', '2020-01-01');
      expect(total).toBe(0);
    });
  });
});
