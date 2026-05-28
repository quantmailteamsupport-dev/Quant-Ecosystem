import { Routine, RoutineRunner, RoutineStep } from '../index.js';

describe('RoutineRunner', () => {
  let runner: RoutineRunner;
  let executedSteps: RoutineStep[];

  const routine: Routine = {
    id: 'routine-1',
    name: 'Morning',
    steps: [
      { deviceId: 'light-1', command: 'on', properties: { brightness: 80 }, delayMs: 100 },
      { deviceId: 'geyser-1', command: 'on', properties: { temp: 55 }, delayMs: 50 },
    ],
  };

  beforeEach(() => {
    vi.useFakeTimers();
    executedSteps = [];
    runner = new RoutineRunner(async (step) => {
      executedSteps.push(step);
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('adds and retrieves a routine', () => {
    runner.addRoutine(routine);
    expect(runner.getRoutine('routine-1')).toEqual(routine);
  });

  it('removes a routine', () => {
    runner.addRoutine(routine);
    expect(runner.removeRoutine('routine-1')).toBe(true);
    expect(runner.getRoutine('routine-1')).toBeUndefined();
  });

  it('executes steps in order with delays', async () => {
    runner.addRoutine(routine);
    const promise = runner.executeRoutine('routine-1');
    await vi.advanceTimersByTimeAsync(100);
    await vi.advanceTimersByTimeAsync(50);
    const result = await promise;
    expect(result).toBe(true);
    expect(executedSteps).toHaveLength(2);
    expect(executedSteps[0]!.deviceId).toBe('light-1');
    expect(executedSteps[1]!.deviceId).toBe('geyser-1');
  });

  it('returns false for non-existent routine', async () => {
    const result = await runner.executeRoutine('nope');
    expect(result).toBe(false);
  });

  it('tracks execution status', async () => {
    runner.addRoutine(routine);
    expect(runner.getStatus('routine-1')).toBe('idle');
    const promise = runner.executeRoutine('routine-1');
    expect(runner.getStatus('routine-1')).toBe('running');
    await vi.advanceTimersByTimeAsync(200);
    await promise;
    expect(runner.getStatus('routine-1')).toBe('completed');
  });

  it('lists all routines', () => {
    runner.addRoutine(routine);
    expect(runner.listRoutines()).toHaveLength(1);
  });
});
