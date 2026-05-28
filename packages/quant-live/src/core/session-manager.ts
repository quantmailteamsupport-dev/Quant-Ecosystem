import type { LiveSession, LiveSessionConfig, LiveSessionState } from '../types.js';

type StateChangeListener = (
  session: LiveSession,
  from: LiveSessionState,
  to: LiveSessionState,
) => void;

const VALID_TRANSITIONS: Record<LiveSessionState, LiveSessionState[]> = {
  idle: ['listening', 'ended'],
  listening: ['processing', 'idle', 'ended'],
  processing: ['speaking', 'listening', 'ended'],
  speaking: ['idle', 'interrupted', 'ended'],
  interrupted: ['listening', 'idle', 'ended'],
  ended: [],
};

export class SessionManager {
  private sessions: Map<string, LiveSession> = new Map();
  private listeners: StateChangeListener[] = [];
  private nextId = 1;

  create(config: LiveSessionConfig): LiveSession {
    const session: LiveSession = {
      id: `session-${this.nextId++}`,
      state: 'idle',
      createdAt: Date.now(),
      config,
      transcript: [],
    };
    this.sessions.set(session.id, session);
    return session;
  }

  resume(id: string): LiveSession {
    const session = this.sessions.get(id);
    if (!session) {
      throw new Error(`Session not found: ${id}`);
    }
    if (session.state === 'ended') {
      throw new Error(`Cannot resume ended session: ${id}`);
    }
    return session;
  }

  end(id: string): void {
    const session = this.sessions.get(id);
    if (!session) {
      throw new Error(`Session not found: ${id}`);
    }
    this.transition(id, 'ended');
  }

  getSession(id: string): LiveSession | undefined {
    return this.sessions.get(id);
  }

  getState(id: string): LiveSessionState {
    const session = this.sessions.get(id);
    if (!session) {
      throw new Error(`Session not found: ${id}`);
    }
    return session.state;
  }

  transition(id: string, to: LiveSessionState): void {
    const session = this.sessions.get(id);
    if (!session) {
      throw new Error(`Session not found: ${id}`);
    }
    const from = session.state;
    const allowed = VALID_TRANSITIONS[from];
    if (!allowed || !allowed.includes(to)) {
      throw new Error(`Invalid state transition: ${from} -> ${to}`);
    }
    session.state = to;
    for (const listener of this.listeners) {
      listener(session, from, to);
    }
  }

  onStateChange(listener: StateChangeListener): void {
    this.listeners.push(listener);
  }
}
