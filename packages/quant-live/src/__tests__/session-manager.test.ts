import { describe, it, expect, vi } from 'vitest';
import { SessionManager } from '../core/session-manager.js';
import type { LiveSessionConfig } from '../types.js';

const defaultConfig: LiveSessionConfig = {
  asrProvider: 'whisper-server',
  vadConfig: { threshold: 0.01, silenceDuration: 500, minSpeechDuration: 100 },
  enableInterruption: true,
  maxSessionDuration: 300000,
  language: 'en',
};

describe('SessionManager', () => {
  it('creates a session in idle state', () => {
    const manager = new SessionManager();
    const session = manager.create(defaultConfig);
    expect(session.id).toBeDefined();
    expect(session.state).toBe('idle');
    expect(session.config).toEqual(defaultConfig);
    expect(session.transcript).toEqual([]);
  });

  it('creates multiple sessions with unique ids', () => {
    const manager = new SessionManager();
    const s1 = manager.create(defaultConfig);
    const s2 = manager.create(defaultConfig);
    expect(s1.id).not.toBe(s2.id);
  });

  it('retrieves a session by id', () => {
    const manager = new SessionManager();
    const session = manager.create(defaultConfig);
    expect(manager.getSession(session.id)).toBe(session);
  });

  it('returns undefined for unknown session id', () => {
    const manager = new SessionManager();
    expect(manager.getSession('unknown')).toBeUndefined();
  });

  it('resumes an existing session', () => {
    const manager = new SessionManager();
    const session = manager.create(defaultConfig);
    const resumed = manager.resume(session.id);
    expect(resumed.id).toBe(session.id);
  });

  it('throws when resuming a non-existent session', () => {
    const manager = new SessionManager();
    expect(() => manager.resume('unknown')).toThrow('Session not found');
  });

  it('throws when resuming an ended session', () => {
    const manager = new SessionManager();
    const session = manager.create(defaultConfig);
    manager.end(session.id);
    expect(() => manager.resume(session.id)).toThrow('Cannot resume ended session');
  });

  it('transitions through valid states: idle -> listening -> processing -> speaking -> idle', () => {
    const manager = new SessionManager();
    const session = manager.create(defaultConfig);

    manager.transition(session.id, 'listening');
    expect(manager.getState(session.id)).toBe('listening');

    manager.transition(session.id, 'processing');
    expect(manager.getState(session.id)).toBe('processing');

    manager.transition(session.id, 'speaking');
    expect(manager.getState(session.id)).toBe('speaking');

    manager.transition(session.id, 'idle');
    expect(manager.getState(session.id)).toBe('idle');
  });

  it('transitions to interrupted from speaking', () => {
    const manager = new SessionManager();
    const session = manager.create(defaultConfig);
    manager.transition(session.id, 'listening');
    manager.transition(session.id, 'processing');
    manager.transition(session.id, 'speaking');
    manager.transition(session.id, 'interrupted');
    expect(manager.getState(session.id)).toBe('interrupted');
  });

  it('throws on invalid state transitions', () => {
    const manager = new SessionManager();
    const session = manager.create(defaultConfig);
    expect(() => manager.transition(session.id, 'speaking')).toThrow('Invalid state transition');
    expect(() => manager.transition(session.id, 'processing')).toThrow('Invalid state transition');
  });

  it('throws when transitioning from ended state', () => {
    const manager = new SessionManager();
    const session = manager.create(defaultConfig);
    manager.end(session.id);
    expect(() => manager.transition(session.id, 'idle')).toThrow('Invalid state transition');
  });

  it('emits state change events', () => {
    const manager = new SessionManager();
    const listener = vi.fn();
    manager.onStateChange(listener);

    const session = manager.create(defaultConfig);
    manager.transition(session.id, 'listening');

    expect(listener).toHaveBeenCalledWith(session, 'idle', 'listening');
  });

  it('ends a session by setting state to ended', () => {
    const manager = new SessionManager();
    const session = manager.create(defaultConfig);
    manager.end(session.id);
    expect(manager.getState(session.id)).toBe('ended');
  });
});
