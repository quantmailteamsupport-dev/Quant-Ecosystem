// ============================================================================
// Gesture System - Multi-Touch Recognition with Physics-Based Calculations
// ============================================================================

type GestureState = 'possible' | 'began' | 'changed' | 'ended' | 'cancelled' | 'failed';

type GestureType = 'tap' | 'double_tap' | 'long_press' | 'pan' | 'pinch' | 'rotate' | 'swipe';

type SwipeDirection = 'up' | 'down' | 'left' | 'right';

interface TouchPoint {
  id: number;
  x: number;
  y: number;
  timestamp: number;
  force?: number;
}

interface GestureRecognizer {
  id: string;
  type: GestureType;
  state: GestureState;
  priority: number;
  requireFailureOf: string[];
  allowSimultaneous: string[];
  isEnabled: boolean;
}

interface TapConfig {
  maxDuration: number;
  maxDistance: number;
  numberOfTaps: number;
  numberOfTouches: number;
}

interface LongPressConfig {
  minimumDuration: number;
  maxDistance: number;
  numberOfTouches: number;
}

interface PanConfig {
  minimumDistance: number;
  maximumTouches: number;
  minimumTouches: number;
}

interface PinchConfig {
  minimumScale: number;
}

interface SwipeConfig {
  minimumVelocity: number;
  minimumDistance: number;
  maximumDuration: number;
  direction: SwipeDirection | 'any';
}

interface VelocityState {
  positions: Array<{ x: number; y: number; timestamp: number }>;
  velocityX: number;
  velocityY: number;
  speed: number;
}

interface GestureEvent {
  recognizerId: string;
  type: GestureType;
  state: GestureState;
  timestamp: number;
  touches: TouchPoint[];
  translation?: { x: number; y: number };
  velocity?: { x: number; y: number };
  scale?: number;
  rotation?: number;
  direction?: SwipeDirection;
  numberOfTouches: number;
}

interface MomentumResult {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  isActive: boolean;
}

interface ConflictResolution {
  winner: string;
  loser: string;
  reason: 'priority' | 'failure_requirement' | 'simultaneous';
}

export class GestureSystem {
  private recognizers: Map<string, GestureRecognizer> = new Map();
  private activeRecognizers: Set<string> = new Set();
  private touchPoints: Map<number, TouchPoint> = new Map();
  private velocityTrackers: Map<string, VelocityState> = new Map();
  private gestureStartPoints: Map<string, TouchPoint[]> = new Map();
  private eventHistory: GestureEvent[] = [];
  private tapCounts: Map<string, { count: number; lastTapTime: number }> = new Map();
  private longPressTimers: Map<string, number> = new Map();
  private decayFactor: number = 4.0; // Exponential decay constant

  // Configurations
  private tapConfigs: Map<string, TapConfig> = new Map();
  private longPressConfigs: Map<string, LongPressConfig> = new Map();
  private panConfigs: Map<string, PanConfig> = new Map();
  private pinchConfigs: Map<string, PinchConfig> = new Map();
  private swipeConfigs: Map<string, SwipeConfig> = new Map();

  /**
   * Register a gesture recognizer.
   */
  registerRecognizer(
    id: string,
    type: GestureType,
    options: {
      priority?: number;
      requireFailureOf?: string[];
      allowSimultaneous?: string[];
    } = {},
  ): GestureRecognizer {
    const recognizer: GestureRecognizer = {
      id,
      type,
      state: 'possible',
      priority: options.priority ?? 0,
      requireFailureOf: options.requireFailureOf ?? [],
      allowSimultaneous: options.allowSimultaneous ?? [],
      isEnabled: true,
    };

    this.recognizers.set(id, recognizer);
    return recognizer;
  }

  /**
   * Configure a tap recognizer.
   */
  configureTap(recognizerId: string, config?: Partial<TapConfig>): void {
    this.tapConfigs.set(recognizerId, {
      maxDuration: config?.maxDuration ?? 300,
      maxDistance: config?.maxDistance ?? 10,
      numberOfTaps: config?.numberOfTaps ?? 1,
      numberOfTouches: config?.numberOfTouches ?? 1,
    });
  }

  /**
   * Configure a double-tap recognizer.
   */
  configureDoubleTap(recognizerId: string, config?: Partial<TapConfig>): void {
    this.tapConfigs.set(recognizerId, {
      maxDuration: config?.maxDuration ?? 300,
      maxDistance: config?.maxDistance ?? 10,
      numberOfTaps: config?.numberOfTaps ?? 2,
      numberOfTouches: config?.numberOfTouches ?? 1,
    });
  }

  /**
   * Configure a long press recognizer.
   */
  configureLongPress(recognizerId: string, config?: Partial<LongPressConfig>): void {
    this.longPressConfigs.set(recognizerId, {
      minimumDuration: config?.minimumDuration ?? 500,
      maxDistance: config?.maxDistance ?? 10,
      numberOfTouches: config?.numberOfTouches ?? 1,
    });
  }

  /**
   * Configure a pan recognizer.
   */
  configurePan(recognizerId: string, config?: Partial<PanConfig>): void {
    this.panConfigs.set(recognizerId, {
      minimumDistance: config?.minimumDistance ?? 10,
      maximumTouches: config?.maximumTouches ?? 10,
      minimumTouches: config?.minimumTouches ?? 1,
    });
  }

  /**
   * Configure a pinch recognizer.
   */
  configurePinch(recognizerId: string, config?: Partial<PinchConfig>): void {
    this.pinchConfigs.set(recognizerId, {
      minimumScale: config?.minimumScale ?? 0.01,
    });
  }

  /**
   * Configure a swipe recognizer.
   */
  configureSwipe(recognizerId: string, config?: Partial<SwipeConfig>): void {
    this.swipeConfigs.set(recognizerId, {
      minimumVelocity: config?.minimumVelocity ?? 300,
      minimumDistance: config?.minimumDistance ?? 50,
      maximumDuration: config?.maximumDuration ?? 500,
      direction: config?.direction ?? 'any',
    });
  }

  /**
   * Process a touch start event.
   */
  touchStart(touches: TouchPoint[]): GestureEvent[] {
    const events: GestureEvent[] = [];

    for (const touch of touches) {
      this.touchPoints.set(touch.id, touch);
    }

    // Start tracking for all possible recognizers
    for (const [id, recognizer] of this.recognizers) {
      if (!recognizer.isEnabled) continue;
      if (recognizer.state !== 'possible') continue;

      // Check failure requirements
      if (!this.checkFailureRequirements(recognizer)) continue;

      // Store start points
      this.gestureStartPoints.set(id, [...this.touchPoints.values()]);

      // Initialize velocity tracker
      this.velocityTrackers.set(id, {
        positions: touches.map((t) => ({ x: t.x, y: t.y, timestamp: t.timestamp })),
        velocityX: 0,
        velocityY: 0,
        speed: 0,
      });

      // Start long press timer
      if (recognizer.type === 'long_press') {
        const config = this.longPressConfigs.get(id);
        if (config) {
          this.longPressTimers.set(id, touches[0]?.timestamp ?? Date.now());
        }
      }
    }

    return events;
  }

  /**
   * Process a touch move event.
   */
  touchMove(touches: TouchPoint[]): GestureEvent[] {
    const events: GestureEvent[] = [];

    for (const touch of touches) {
      this.touchPoints.set(touch.id, touch);
    }

    for (const [id, recognizer] of this.recognizers) {
      if (!recognizer.isEnabled) continue;
      if (
        recognizer.state !== 'possible' &&
        recognizer.state !== 'began' &&
        recognizer.state !== 'changed'
      )
        continue;

      const startPoints = this.gestureStartPoints.get(id);
      if (!startPoints || startPoints.length === 0) continue;

      // Update velocity
      this.updateVelocity(id, touches);

      const event = this.processRecognizerMove(id, recognizer, startPoints, touches);
      if (event) {
        events.push(event);
        this.eventHistory.push(event);
      }
    }

    return events;
  }

  /**
   * Process a touch end event.
   */
  touchEnd(touches: TouchPoint[]): GestureEvent[] {
    const events: GestureEvent[] = [];

    for (const [id, recognizer] of this.recognizers) {
      if (!recognizer.isEnabled) continue;

      const event = this.processRecognizerEnd(id, recognizer, touches);
      if (event) {
        events.push(event);
        this.eventHistory.push(event);
      }
    }

    // Remove ended touch points
    for (const touch of touches) {
      this.touchPoints.delete(touch.id);
    }

    // Reset recognizers if no touches remain
    if (this.touchPoints.size === 0) {
      this.resetAllRecognizers();
    }

    return events;
  }

  /**
   * Process recognizer during move phase.
   */
  private processRecognizerMove(
    id: string,
    recognizer: GestureRecognizer,
    startPoints: TouchPoint[],
    currentTouches: TouchPoint[],
  ): GestureEvent | null {
    switch (recognizer.type) {
      case 'pan':
        return this.processPanMove(id, recognizer, startPoints, currentTouches);
      case 'pinch':
        return this.processPinchMove(id, recognizer, startPoints, currentTouches);
      case 'rotate':
        return this.processRotateMove(id, recognizer, startPoints, currentTouches);
      case 'long_press':
        return this.processLongPressMove(id, recognizer, startPoints);
      default:
        return null;
    }
  }

  /**
   * Process pan gesture movement.
   */
  private processPanMove(
    id: string,
    recognizer: GestureRecognizer,
    startPoints: TouchPoint[],
    currentTouches: TouchPoint[],
  ): GestureEvent | null {
    const config = this.panConfigs.get(id);
    if (!config) return null;
    if (currentTouches.length < config.minimumTouches) return null;
    if (currentTouches.length > config.maximumTouches) return null;

    const startPoint = startPoints[0];
    const currentPoint = currentTouches[0];
    if (!startPoint || !currentPoint) return null;

    const dx = currentPoint.x - startPoint.x;
    const dy = currentPoint.y - startPoint.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (recognizer.state === 'possible' && distance < config.minimumDistance) {
      return null;
    }

    const newState: GestureState = recognizer.state === 'possible' ? 'began' : 'changed';
    recognizer.state = newState;
    this.activeRecognizers.add(id);

    const velocity = this.velocityTrackers.get(id);

    return {
      recognizerId: id,
      type: 'pan',
      state: newState,
      timestamp: currentPoint.timestamp,
      touches: currentTouches,
      translation: { x: dx, y: dy },
      velocity: velocity ? { x: velocity.velocityX, y: velocity.velocityY } : { x: 0, y: 0 },
      numberOfTouches: currentTouches.length,
    };
  }

  /**
   * Process pinch gesture.
   */
  private processPinchMove(
    id: string,
    recognizer: GestureRecognizer,
    startPoints: TouchPoint[],
    currentTouches: TouchPoint[],
  ): GestureEvent | null {
    if (currentTouches.length < 2 || startPoints.length < 2) return null;

    const config = this.pinchConfigs.get(id);
    if (!config) return null;

    const startDist = this.distanceBetweenPoints(startPoints[0]!, startPoints[1]!);
    const currentDist = this.distanceBetweenPoints(currentTouches[0]!, currentTouches[1]!);

    if (startDist === 0) return null;
    const scale = currentDist / startDist;

    if (recognizer.state === 'possible' && Math.abs(scale - 1) < config.minimumScale) {
      return null;
    }

    const newState: GestureState = recognizer.state === 'possible' ? 'began' : 'changed';
    recognizer.state = newState;
    this.activeRecognizers.add(id);

    return {
      recognizerId: id,
      type: 'pinch',
      state: newState,
      timestamp: currentTouches[0]?.timestamp ?? Date.now(),
      touches: currentTouches,
      scale,
      numberOfTouches: currentTouches.length,
    };
  }

  /**
   * Process rotate gesture.
   */
  private processRotateMove(
    id: string,
    recognizer: GestureRecognizer,
    startPoints: TouchPoint[],
    currentTouches: TouchPoint[],
  ): GestureEvent | null {
    if (currentTouches.length < 2 || startPoints.length < 2) return null;

    const startAngle = this.angleBetweenPoints(startPoints[0]!, startPoints[1]!);
    const currentAngle = this.angleBetweenPoints(currentTouches[0]!, currentTouches[1]!);
    const rotation = currentAngle - startAngle;

    if (recognizer.state === 'possible' && Math.abs(rotation) < 0.1) {
      return null;
    }

    const newState: GestureState = recognizer.state === 'possible' ? 'began' : 'changed';
    recognizer.state = newState;
    this.activeRecognizers.add(id);

    return {
      recognizerId: id,
      type: 'rotate',
      state: newState,
      timestamp: currentTouches[0]?.timestamp ?? Date.now(),
      touches: currentTouches,
      rotation,
      numberOfTouches: currentTouches.length,
    };
  }

  /**
   * Process long press during movement (cancel if moved too far).
   */
  private processLongPressMove(
    id: string,
    recognizer: GestureRecognizer,
    startPoints: TouchPoint[],
  ): GestureEvent | null {
    const config = this.longPressConfigs.get(id);
    if (!config) return null;

    const startPoint = startPoints[0];
    if (!startPoint) return null;

    const current = this.touchPoints.values().next().value as TouchPoint | undefined;
    if (!current) return null;

    const dx = current.x - startPoint.x;
    const dy = current.y - startPoint.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > config.maxDistance && recognizer.state === 'possible') {
      recognizer.state = 'failed';
      return null;
    }

    return null;
  }

  /**
   * Process recognizer at touch end.
   */
  private processRecognizerEnd(
    id: string,
    recognizer: GestureRecognizer,
    endTouches: TouchPoint[],
  ): GestureEvent | null {
    const startPoints = this.gestureStartPoints.get(id);
    if (!startPoints || startPoints.length === 0) return null;

    switch (recognizer.type) {
      case 'tap':
      case 'double_tap':
        return this.processTapEnd(id, recognizer, startPoints, endTouches);
      case 'swipe':
        return this.processSwipeEnd(id, recognizer, startPoints, endTouches);
      case 'pan':
      case 'pinch':
      case 'rotate':
        if (recognizer.state === 'began' || recognizer.state === 'changed') {
          recognizer.state = 'ended';
          return {
            recognizerId: id,
            type: recognizer.type,
            state: 'ended',
            timestamp: endTouches[0]?.timestamp ?? Date.now(),
            touches: endTouches,
            numberOfTouches: endTouches.length,
          };
        }
        return null;
      case 'long_press':
        return this.processLongPressEnd(id, recognizer, startPoints, endTouches);
      default:
        return null;
    }
  }

  /**
   * Process tap at touch end.
   */
  private processTapEnd(
    id: string,
    recognizer: GestureRecognizer,
    startPoints: TouchPoint[],
    endTouches: TouchPoint[],
  ): GestureEvent | null {
    const config = this.tapConfigs.get(id);
    if (!config) return null;

    const startPoint = startPoints[0];
    const endPoint = endTouches[0];
    if (!startPoint || !endPoint) return null;

    const duration = endPoint.timestamp - startPoint.timestamp;
    if (duration > config.maxDuration) return null;

    const dx = endPoint.x - startPoint.x;
    const dy = endPoint.y - startPoint.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance > config.maxDistance) return null;

    // Handle multi-tap counting
    const tapState = this.tapCounts.get(id) ?? { count: 0, lastTapTime: 0 };
    const timeSinceLastTap = endPoint.timestamp - tapState.lastTapTime;

    if (timeSinceLastTap > 500) {
      tapState.count = 1;
    } else {
      tapState.count += 1;
    }
    tapState.lastTapTime = endPoint.timestamp;
    this.tapCounts.set(id, tapState);

    if (tapState.count < config.numberOfTaps) return null;

    // Reset tap count
    tapState.count = 0;
    recognizer.state = 'ended';

    return {
      recognizerId: id,
      type: config.numberOfTaps > 1 ? 'double_tap' : 'tap',
      state: 'ended',
      timestamp: endPoint.timestamp,
      touches: endTouches,
      numberOfTouches: endTouches.length,
    };
  }

  /**
   * Process swipe at touch end.
   */
  private processSwipeEnd(
    id: string,
    recognizer: GestureRecognizer,
    startPoints: TouchPoint[],
    endTouches: TouchPoint[],
  ): GestureEvent | null {
    const config = this.swipeConfigs.get(id);
    if (!config) return null;

    const startPoint = startPoints[0];
    const endPoint = endTouches[0];
    if (!startPoint || !endPoint) return null;

    const dx = endPoint.x - startPoint.x;
    const dy = endPoint.y - startPoint.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const duration = endPoint.timestamp - startPoint.timestamp;

    if (distance < config.minimumDistance) return null;
    if (duration > config.maximumDuration) return null;

    const velocity = distance / (duration / 1000);
    if (velocity < config.minimumVelocity) return null;

    // Detect direction from angle
    const direction = this.detectDirection(dx, dy);

    if (config.direction !== 'any' && config.direction !== direction) return null;

    recognizer.state = 'ended';

    return {
      recognizerId: id,
      type: 'swipe',
      state: 'ended',
      timestamp: endPoint.timestamp,
      touches: endTouches,
      direction,
      velocity: { x: dx / (duration / 1000), y: dy / (duration / 1000) },
      numberOfTouches: endTouches.length,
    };
  }

  /**
   * Process long press at touch end.
   */
  private processLongPressEnd(
    id: string,
    recognizer: GestureRecognizer,
    _startPoints: TouchPoint[],
    endTouches: TouchPoint[],
  ): GestureEvent | null {
    const config = this.longPressConfigs.get(id);
    if (!config) return null;

    const startTime = this.longPressTimers.get(id);
    if (startTime === undefined) return null;

    const endPoint = endTouches[0];
    if (!endPoint) return null;

    const duration = endPoint.timestamp - startTime;
    if (duration >= config.minimumDuration && recognizer.state === 'possible') {
      recognizer.state = 'ended';
      return {
        recognizerId: id,
        type: 'long_press',
        state: 'ended',
        timestamp: endPoint.timestamp,
        touches: endTouches,
        numberOfTouches: endTouches.length,
      };
    }

    return null;
  }

  /**
   * Calculate velocity using exponential decay.
   * v = distance / time, momentum = v * e^(-decay * t)
   */
  calculateMomentum(velocity: { x: number; y: number }, elapsedMs: number): MomentumResult {
    const t = elapsedMs / 1000; // Convert to seconds
    const decayMultiplier = Math.exp(-this.decayFactor * t);

    const vx = velocity.x * decayMultiplier;
    const vy = velocity.y * decayMultiplier;

    // Calculate position displacement (integral of v * e^(-decay*t))
    const displacementFactor = (1 - decayMultiplier) / this.decayFactor;
    const x = velocity.x * displacementFactor;
    const y = velocity.y * displacementFactor;

    const isActive = Math.abs(vx) > 0.1 || Math.abs(vy) > 0.1;

    return {
      x: Math.round(x * 100) / 100,
      y: Math.round(y * 100) / 100,
      velocityX: Math.round(vx * 100) / 100,
      velocityY: Math.round(vy * 100) / 100,
      isActive,
    };
  }

  /**
   * Detect swipe direction from delta x/y.
   */
  detectDirection(dx: number, dy: number): SwipeDirection {
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);

    if (angle >= -45 && angle < 45) return 'right';
    if (angle >= 45 && angle < 135) return 'down';
    if (angle >= -135 && angle < -45) return 'up';
    return 'left';
  }

  /**
   * Update velocity tracker with new positions.
   */
  private updateVelocity(id: string, touches: TouchPoint[]): void {
    const tracker = this.velocityTrackers.get(id);
    if (!tracker || touches.length === 0) return;

    const current = touches[0]!;
    tracker.positions.push({ x: current.x, y: current.y, timestamp: current.timestamp });

    // Keep last 5 positions for velocity calculation
    if (tracker.positions.length > 5) {
      tracker.positions.shift();
    }

    // Calculate velocity from last two positions
    if (tracker.positions.length >= 2) {
      const prev = tracker.positions[tracker.positions.length - 2]!;
      const curr = tracker.positions[tracker.positions.length - 1]!;
      const dt = (curr.timestamp - prev.timestamp) / 1000; // seconds

      if (dt > 0) {
        tracker.velocityX = (curr.x - prev.x) / dt;
        tracker.velocityY = (curr.y - prev.y) / dt;
        tracker.speed = Math.sqrt(tracker.velocityX ** 2 + tracker.velocityY ** 2);
      }
    }
  }

  /**
   * Resolve conflicts between recognizers.
   */
  resolveConflicts(): ConflictResolution[] {
    const resolutions: ConflictResolution[] = [];
    const activeList = [...this.activeRecognizers];

    for (let i = 0; i < activeList.length; i++) {
      for (let j = i + 1; j < activeList.length; j++) {
        const id1 = activeList[i]!;
        const id2 = activeList[j]!;
        const r1 = this.recognizers.get(id1);
        const r2 = this.recognizers.get(id2);

        if (!r1 || !r2) continue;

        // Check if they can be simultaneous
        if (r1.allowSimultaneous.includes(id2) || r2.allowSimultaneous.includes(id1)) {
          continue;
        }

        // Higher priority wins
        if (r1.priority !== r2.priority) {
          const winner = r1.priority > r2.priority ? id1 : id2;
          const loser = winner === id1 ? id2 : id1;
          resolutions.push({ winner, loser, reason: 'priority' });

          const loserRecognizer = this.recognizers.get(loser);
          if (loserRecognizer) {
            loserRecognizer.state = 'failed';
            this.activeRecognizers.delete(loser);
          }
        }
      }
    }

    return resolutions;
  }

  /**
   * Check if failure requirements are met.
   */
  private checkFailureRequirements(recognizer: GestureRecognizer): boolean {
    for (const requiredFailure of recognizer.requireFailureOf) {
      const other = this.recognizers.get(requiredFailure);
      if (other && other.state !== 'failed') {
        return false;
      }
    }
    return true;
  }

  /**
   * Reset all recognizers to possible state.
   */
  private resetAllRecognizers(): void {
    for (const [, recognizer] of this.recognizers) {
      recognizer.state = 'possible';
    }
    this.activeRecognizers.clear();
    this.gestureStartPoints.clear();
    this.velocityTrackers.clear();
    this.longPressTimers.clear();
  }

  /**
   * Calculate distance between two touch points.
   */
  private distanceBetweenPoints(p1: TouchPoint, p2: TouchPoint): number {
    return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
  }

  /**
   * Calculate angle between two touch points.
   */
  private angleBetweenPoints(p1: TouchPoint, p2: TouchPoint): number {
    return Math.atan2(p2.y - p1.y, p2.x - p1.x);
  }

  /**
   * Get all registered recognizers.
   */
  getRecognizers(): GestureRecognizer[] {
    return [...this.recognizers.values()];
  }

  /**
   * Get a recognizer by ID.
   */
  getRecognizer(id: string): GestureRecognizer | undefined {
    return this.recognizers.get(id);
  }

  /**
   * Enable/disable a recognizer.
   */
  setRecognizerEnabled(id: string, enabled: boolean): void {
    const recognizer = this.recognizers.get(id);
    if (recognizer) {
      recognizer.isEnabled = enabled;
    }
  }

  /**
   * Get the current touch point count.
   */
  getActiveTouchCount(): number {
    return this.touchPoints.size;
  }

  /**
   * Get recent gesture events.
   */
  getRecentEvents(limit: number = 20): GestureEvent[] {
    return this.eventHistory.slice(-limit);
  }
}
