import type { HandGesture, GestureSequence } from '../types.js';

const TYPES = new Set(['pinch', 'grab', 'point', 'swipe']);
const HANDS = new Set(['left', 'right']);

export class HandTracker {
  private listeners: Array<(g: HandGesture) => void> = [];
  private active = false;
  private sequences: GestureSequence[] = [];
  private recentGestures: Array<{
    type: HandGesture['type'];
    hand: HandGesture['hand'];
    timestamp: number;
  }> = [];
  private sequenceTimeoutMs = 2000;

  detect(rawInput: unknown): HandGesture | null {
    if (!rawInput || typeof rawInput !== 'object') return null;
    const inp = rawInput as Record<string, unknown>;
    if (typeof inp['type'] !== 'string' || !TYPES.has(inp['type'])) return null;
    if (typeof inp['confidence'] !== 'number') return null;
    if (inp['confidence'] < 0 || inp['confidence'] > 1) return null;
    if (typeof inp['hand'] !== 'string' || !HANDS.has(inp['hand'])) return null;
    const gesture: HandGesture = {
      type: inp['type'] as HandGesture['type'],
      confidence: inp['confidence'],
      hand: inp['hand'] as HandGesture['hand'],
    };
    if (this.active) {
      this.listeners.forEach((cb) => cb(gesture));
      this.recentGestures.push({ type: gesture.type, hand: gesture.hand, timestamp: Date.now() });
    }
    return gesture;
  }

  onGesture(cb: (g: HandGesture) => void): void {
    this.listeners.push(cb);
  }

  start(): void {
    this.active = true;
  }

  stop(): void {
    this.active = false;
  }

  registerSequence(sequence: GestureSequence): void {
    this.sequences.push(sequence);
  }

  checkSequence(now = Date.now()): string | null {
    const recent = this.recentGestures.filter((g) => now - g.timestamp < this.sequenceTimeoutMs);
    this.recentGestures = recent;

    for (const seq of this.sequences) {
      if (recent.length < seq.steps.length) continue;
      const tail = recent.slice(-seq.steps.length);
      const match = seq.steps.every(
        (step, i) => tail[i]!.type === step.type && tail[i]!.hand === step.hand,
      );
      if (match) return seq.action;
    }
    return null;
  }

  detectTwoHand(left: HandGesture | null, right: HandGesture | null): string | null {
    if (!left || !right) return null;
    if (left.type === 'pinch' && right.type === 'pinch') return 'scale';
    if (left.type === 'grab' && right.type === 'grab') return 'rotate';
    return null;
  }

  resolveConflict(actions: string[]): string | null {
    if (actions.length === 0) return null;
    return actions[0]!;
  }
}
