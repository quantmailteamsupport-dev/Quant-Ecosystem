// ============================================================================
// Micro Interaction Engine - Feedback Patterns, Haptics, and State Transitions
// ============================================================================

type InteractionType =
  | 'button_press'
  | 'toggle'
  | 'input_focus'
  | 'scroll'
  | 'parallax'
  | 'loading'
  | 'state_change';

type HapticPattern =
  | 'light'
  | 'medium'
  | 'heavy'
  | 'success'
  | 'error'
  | 'warning'
  | 'selection'
  | 'impact';

type EasingFunction =
  | 'linear'
  | 'ease'
  | 'ease-in'
  | 'ease-out'
  | 'ease-in-out'
  | 'spring'
  | 'bounce';

interface AnimationKeyframe {
  offset: number; // 0 to 1
  properties: Record<string, number | string>;
  easing?: EasingFunction;
}

interface InteractionFeedback {
  id: string;
  type: InteractionType;
  keyframes: AnimationKeyframe[];
  duration: number;
  delay: number;
  iterations: number;
  direction: 'normal' | 'reverse' | 'alternate';
  fillMode: 'none' | 'forwards' | 'backwards' | 'both';
}

interface HapticFeedbackConfig {
  pattern: HapticPattern;
  duration: number;
  intensity: number;
  delays: number[];
  amplitudes: number[];
}

interface TimelineEntry {
  id: string;
  startTime: number;
  duration: number;
  feedback: InteractionFeedback;
  isComplete: boolean;
  isInterrupted: boolean;
  progress: number;
}

interface ScrollAnimation {
  id: string;
  threshold: number; // 0-1, when to trigger
  offset: number; // px offset from threshold
  keyframes: AnimationKeyframe[];
  duration: number;
  triggerOnce: boolean;
  hasTriggered: boolean;
}

interface ParallaxLayer {
  id: string;
  depth: number; // 0 = background (slowest), 1 = foreground (fastest)
  speedRatio: number; // How fast this layer moves relative to scroll
  direction: 'vertical' | 'horizontal' | 'both';
  bounds: { min: number; max: number };
}

interface SpringConfig {
  stiffness: number;
  damping: number;
  mass: number;
  initialVelocity: number;
}

interface SpringState {
  position: number;
  velocity: number;
  isAtRest: boolean;
}

interface LoadingState {
  id: string;
  phase: 'idle' | 'skeleton' | 'loading' | 'completing' | 'complete' | 'error';
  progress: number;
  skeleton: SkeletonConfig;
  transitions: Map<string, InteractionFeedback>;
}

interface SkeletonConfig {
  shimmerSpeed: number;
  shimmerAngle: number;
  borderRadius: number;
  baseColor: string;
  highlightColor: string;
}

export class MicroInteractionEngine {
  private feedbacks: Map<string, InteractionFeedback> = new Map();
  private hapticConfigs: Map<HapticPattern, HapticFeedbackConfig> = new Map();
  private timelines: Map<string, TimelineEntry[]> = new Map();
  private scrollAnimations: ScrollAnimation[] = [];
  private parallaxLayers: ParallaxLayer[] = [];
  private loadingStates: Map<string, LoadingState> = new Map();
  private springConfigs: Map<string, SpringConfig> = new Map();

  constructor() {
    this.initializeDefaultHaptics();
    this.initializeDefaultFeedbacks();
  }

  /**
   * Initialize default haptic feedback patterns.
   */
  private initializeDefaultHaptics(): void {
    this.hapticConfigs.set('light', {
      pattern: 'light',
      duration: 10,
      intensity: 0.3,
      delays: [0],
      amplitudes: [0.3],
    });

    this.hapticConfigs.set('medium', {
      pattern: 'medium',
      duration: 20,
      intensity: 0.6,
      delays: [0],
      amplitudes: [0.6],
    });

    this.hapticConfigs.set('heavy', {
      pattern: 'heavy',
      duration: 30,
      intensity: 1.0,
      delays: [0],
      amplitudes: [1.0],
    });

    this.hapticConfigs.set('success', {
      pattern: 'success',
      duration: 50,
      intensity: 0.7,
      delays: [0, 20],
      amplitudes: [0.5, 0.7],
    });

    this.hapticConfigs.set('error', {
      pattern: 'error',
      duration: 80,
      intensity: 0.8,
      delays: [0, 15, 30],
      amplitudes: [0.8, 0.4, 0.8],
    });

    this.hapticConfigs.set('warning', {
      pattern: 'warning',
      duration: 40,
      intensity: 0.5,
      delays: [0, 20],
      amplitudes: [0.5, 0.5],
    });

    this.hapticConfigs.set('selection', {
      pattern: 'selection',
      duration: 8,
      intensity: 0.2,
      delays: [0],
      amplitudes: [0.2],
    });

    this.hapticConfigs.set('impact', {
      pattern: 'impact',
      duration: 15,
      intensity: 0.9,
      delays: [0],
      amplitudes: [0.9],
    });
  }

  /**
   * Initialize default interaction feedbacks.
   */
  private initializeDefaultFeedbacks(): void {
    // Button press: scale down then back up with spring
    this.registerFeedback({
      id: 'button_press_default',
      type: 'button_press',
      keyframes: [
        { offset: 0, properties: { scale: 1, opacity: 1 } },
        { offset: 0.5, properties: { scale: 0.95, opacity: 0.9 }, easing: 'ease-out' },
        { offset: 1, properties: { scale: 1, opacity: 1 }, easing: 'spring' },
      ],
      duration: 200,
      delay: 0,
      iterations: 1,
      direction: 'normal',
      fillMode: 'both',
    });

    // Toggle slide animation
    this.registerFeedback({
      id: 'toggle_slide',
      type: 'toggle',
      keyframes: [
        { offset: 0, properties: { translateX: 0, backgroundColor: '#ccc' } },
        { offset: 1, properties: { translateX: 20, backgroundColor: '#4CAF50' }, easing: 'spring' },
      ],
      duration: 300,
      delay: 0,
      iterations: 1,
      direction: 'normal',
      fillMode: 'forwards',
    });

    // Toggle morph animation
    this.registerFeedback({
      id: 'toggle_morph',
      type: 'toggle',
      keyframes: [
        { offset: 0, properties: { borderRadius: 4, width: 40 } },
        { offset: 0.5, properties: { borderRadius: 20, width: 48 }, easing: 'ease-in-out' },
        { offset: 1, properties: { borderRadius: 4, width: 40 } },
      ],
      duration: 400,
      delay: 0,
      iterations: 1,
      direction: 'normal',
      fillMode: 'both',
    });

    // Toggle flip animation
    this.registerFeedback({
      id: 'toggle_flip',
      type: 'toggle',
      keyframes: [
        { offset: 0, properties: { rotateY: 0 } },
        { offset: 0.5, properties: { rotateY: 90 }, easing: 'ease-in' },
        { offset: 1, properties: { rotateY: 180 }, easing: 'ease-out' },
      ],
      duration: 500,
      delay: 0,
      iterations: 1,
      direction: 'normal',
      fillMode: 'forwards',
    });

    // Input focus glow
    this.registerFeedback({
      id: 'input_focus_glow',
      type: 'input_focus',
      keyframes: [
        { offset: 0, properties: { boxShadow: '0 0 0 0 rgba(66, 133, 244, 0)' } },
        {
          offset: 1,
          properties: { boxShadow: '0 0 0 4px rgba(66, 133, 244, 0.3)' },
          easing: 'ease-out',
        },
      ],
      duration: 200,
      delay: 0,
      iterations: 1,
      direction: 'normal',
      fillMode: 'forwards',
    });

    // Input focus expand
    this.registerFeedback({
      id: 'input_focus_expand',
      type: 'input_focus',
      keyframes: [
        { offset: 0, properties: { scaleX: 1, borderWidth: 1 } },
        { offset: 1, properties: { scaleX: 1.02, borderWidth: 2 }, easing: 'ease-out' },
      ],
      duration: 150,
      delay: 0,
      iterations: 1,
      direction: 'normal',
      fillMode: 'forwards',
    });

    // Input focus color shift
    this.registerFeedback({
      id: 'input_focus_color',
      type: 'input_focus',
      keyframes: [
        { offset: 0, properties: { borderColor: '#ddd', labelColor: '#666' } },
        {
          offset: 1,
          properties: { borderColor: '#4285f4', labelColor: '#4285f4' },
          easing: 'ease',
        },
      ],
      duration: 200,
      delay: 0,
      iterations: 1,
      direction: 'normal',
      fillMode: 'forwards',
    });
  }

  /**
   * Register a custom interaction feedback.
   */
  registerFeedback(feedback: InteractionFeedback): void {
    this.feedbacks.set(feedback.id, feedback);
  }

  /**
   * Get a feedback by ID.
   */
  getFeedback(id: string): InteractionFeedback | undefined {
    return this.feedbacks.get(id);
  }

  /**
   * Get haptic feedback configuration.
   */
  getHapticConfig(pattern: HapticPattern): HapticFeedbackConfig | undefined {
    return this.hapticConfigs.get(pattern);
  }

  /**
   * Calculate spring physics at time t.
   * Uses damped harmonic oscillator:
   * x(t) = A * e^(-damping * t) * cos(omega * t + phi)
   */
  calculateSpring(config: SpringConfig, targetValue: number, currentTime: number): SpringState {
    const omega = Math.sqrt(config.stiffness / config.mass);
    const dampingRatio = config.damping / (2 * Math.sqrt(config.stiffness * config.mass));

    let position: number;
    let velocity: number;

    if (dampingRatio < 1) {
      // Underdamped - oscillates
      const dampedOmega = omega * Math.sqrt(1 - dampingRatio * dampingRatio);
      const envelope = Math.exp(-dampingRatio * omega * currentTime);
      position =
        targetValue -
        envelope *
          (Math.cos(dampedOmega * currentTime) +
            ((dampingRatio * omega) / dampedOmega) * Math.sin(dampedOmega * currentTime));
      velocity =
        envelope *
        (dampingRatio * omega * Math.cos(dampedOmega * currentTime) +
          dampedOmega * Math.sin(dampedOmega * currentTime) -
          dampingRatio *
            omega *
            ((dampingRatio * omega) / dampedOmega) *
            Math.sin(dampedOmega * currentTime));
    } else if (dampingRatio === 1) {
      // Critically damped - fastest without oscillation
      const envelope = Math.exp(-omega * currentTime);
      position = targetValue - envelope * (1 + omega * currentTime);
      velocity = envelope * omega * omega * currentTime;
    } else {
      // Overdamped - slow return
      const s1 = -omega * (dampingRatio + Math.sqrt(dampingRatio * dampingRatio - 1));
      const s2 = -omega * (dampingRatio - Math.sqrt(dampingRatio * dampingRatio - 1));
      const c2 = -s1 / (s2 - s1);
      const c1 = 1 - c2;
      position = targetValue - (c1 * Math.exp(s1 * currentTime) + c2 * Math.exp(s2 * currentTime));
      velocity = -(c1 * s1 * Math.exp(s1 * currentTime) + c2 * s2 * Math.exp(s2 * currentTime));
    }

    const isAtRest = Math.abs(position - targetValue) < 0.001 && Math.abs(velocity) < 0.001;

    return {
      position: Math.round(position * 1000) / 1000,
      velocity: Math.round(velocity * 1000) / 1000,
      isAtRest,
    };
  }

  /**
   * Register a spring configuration.
   */
  registerSpring(id: string, config: SpringConfig): void {
    this.springConfigs.set(id, config);
  }

  /**
   * Get spring presets.
   */
  getSpringPreset(preset: 'gentle' | 'bouncy' | 'stiff' | 'slow'): SpringConfig {
    switch (preset) {
      case 'gentle':
        return { stiffness: 120, damping: 14, mass: 1, initialVelocity: 0 };
      case 'bouncy':
        return { stiffness: 300, damping: 10, mass: 1, initialVelocity: 0 };
      case 'stiff':
        return { stiffness: 400, damping: 30, mass: 1, initialVelocity: 0 };
      case 'slow':
        return { stiffness: 60, damping: 12, mass: 1, initialVelocity: 0 };
    }
  }

  // ========================================================================
  // Timeline Management
  // ========================================================================

  /**
   * Create an interruptible animation timeline.
   */
  createTimeline(timelineId: string, feedbackIds: string[]): TimelineEntry[] {
    const entries: TimelineEntry[] = [];
    let currentStart = 0;

    for (const feedbackId of feedbackIds) {
      const feedback = this.feedbacks.get(feedbackId);
      if (!feedback) continue;

      entries.push({
        id: `${timelineId}_${feedbackId}`,
        startTime: currentStart,
        duration: feedback.duration,
        feedback,
        isComplete: false,
        isInterrupted: false,
        progress: 0,
      });

      currentStart += feedback.duration + feedback.delay;
    }

    this.timelines.set(timelineId, entries);
    return entries;
  }

  /**
   * Update timeline progress.
   */
  updateTimeline(timelineId: string, elapsedMs: number): TimelineEntry[] {
    const entries = this.timelines.get(timelineId);
    if (!entries) return [];

    for (const entry of entries) {
      if (entry.isInterrupted) continue;

      if (elapsedMs >= entry.startTime) {
        const entryElapsed = elapsedMs - entry.startTime;
        entry.progress = Math.min(1, entryElapsed / entry.duration);
        entry.isComplete = entry.progress >= 1;
      }
    }

    return entries;
  }

  /**
   * Interrupt a timeline at its current position.
   */
  interruptTimeline(timelineId: string): void {
    const entries = this.timelines.get(timelineId);
    if (!entries) return;

    for (const entry of entries) {
      if (!entry.isComplete) {
        entry.isInterrupted = true;
      }
    }
  }

  // ========================================================================
  // Scroll-Triggered Animations
  // ========================================================================

  /**
   * Register a scroll-triggered animation.
   */
  registerScrollAnimation(config: Omit<ScrollAnimation, 'hasTriggered'>): void {
    this.scrollAnimations.push({ ...config, hasTriggered: false });
  }

  /**
   * Process scroll position and return triggered animations.
   */
  processScroll(scrollPosition: number, viewportHeight: number): ScrollAnimation[] {
    const triggered: ScrollAnimation[] = [];

    for (const animation of this.scrollAnimations) {
      if (animation.triggerOnce && animation.hasTriggered) continue;

      const triggerPoint = scrollPosition + viewportHeight * animation.threshold + animation.offset;

      if (scrollPosition >= triggerPoint - viewportHeight) {
        animation.hasTriggered = true;
        triggered.push(animation);
      }
    }

    return triggered;
  }

  /**
   * Calculate scroll progress for an element.
   */
  calculateScrollProgress(
    scrollPosition: number,
    elementTop: number,
    elementHeight: number,
    viewportHeight: number,
  ): number {
    const start = elementTop - viewportHeight;
    const end = elementTop + elementHeight;
    const range = end - start;

    if (range === 0) return 0;

    const progress = (scrollPosition - start) / range;
    return Math.max(0, Math.min(1, progress));
  }

  // ========================================================================
  // Parallax
  // ========================================================================

  /**
   * Register a parallax layer.
   */
  registerParallaxLayer(layer: ParallaxLayer): void {
    this.parallaxLayers.push(layer);
  }

  /**
   * Calculate parallax offset for a layer at a given scroll position.
   */
  calculateParallaxOffset(
    layerId: string,
    scrollPosition: number,
  ): { x: number; y: number } | null {
    const layer = this.parallaxLayers.find((l) => l.id === layerId);
    if (!layer) return null;

    const offset = scrollPosition * layer.speedRatio;
    const clampedOffset = Math.max(layer.bounds.min, Math.min(layer.bounds.max, offset));

    switch (layer.direction) {
      case 'vertical':
        return { x: 0, y: clampedOffset };
      case 'horizontal':
        return { x: clampedOffset, y: 0 };
      case 'both':
        return { x: clampedOffset * 0.5, y: clampedOffset };
    }
  }

  /**
   * Get all parallax offsets for current scroll position.
   */
  getAllParallaxOffsets(scrollPosition: number): Map<string, { x: number; y: number }> {
    const offsets = new Map<string, { x: number; y: number }>();

    for (const layer of this.parallaxLayers) {
      const offset = this.calculateParallaxOffset(layer.id, scrollPosition);
      if (offset) {
        offsets.set(layer.id, offset);
      }
    }

    return offsets;
  }

  // ========================================================================
  // Loading States
  // ========================================================================

  /**
   * Create a loading state manager.
   */
  createLoadingState(id: string, skeleton?: Partial<SkeletonConfig>): LoadingState {
    const state: LoadingState = {
      id,
      phase: 'idle',
      progress: 0,
      skeleton: {
        shimmerSpeed: skeleton?.shimmerSpeed ?? 1500,
        shimmerAngle: skeleton?.shimmerAngle ?? 110,
        borderRadius: skeleton?.borderRadius ?? 4,
        baseColor: skeleton?.baseColor ?? '#e0e0e0',
        highlightColor: skeleton?.highlightColor ?? '#f5f5f5',
      },
      transitions: new Map(),
    };

    this.loadingStates.set(id, state);
    return state;
  }

  /**
   * Transition a loading state.
   */
  transitionLoadingState(
    id: string,
    newPhase: LoadingState['phase'],
    progress?: number,
  ): LoadingState | null {
    const state = this.loadingStates.get(id);
    if (!state) return null;

    state.phase = newPhase;
    if (progress !== undefined) {
      state.progress = Math.max(0, Math.min(1, progress));
    }

    return state;
  }

  /**
   * Get loading state progress animation value.
   * Uses eased progress for smooth visual feedback.
   */
  getEasedProgress(id: string): number {
    const state = this.loadingStates.get(id);
    if (!state) return 0;

    // Apply ease-out cubic for smooth deceleration at end
    const t = state.progress;
    return 1 - Math.pow(1 - t, 3);
  }

  /**
   * Get skeleton shimmer CSS properties.
   */
  getSkeletonStyles(id: string): Record<string, string> | null {
    const state = this.loadingStates.get(id);
    if (!state || state.phase !== 'skeleton') return null;

    const { shimmerSpeed, shimmerAngle, borderRadius, baseColor, highlightColor } = state.skeleton;

    return {
      'background-color': baseColor,
      'background-image': `linear-gradient(${shimmerAngle}deg, ${baseColor} 25%, ${highlightColor} 50%, ${baseColor} 75%)`,
      'background-size': '200% 100%',
      animation: `shimmer ${shimmerSpeed}ms infinite linear`,
      'border-radius': `${borderRadius}px`,
    };
  }

  /**
   * Interpolate between two values at a given progress.
   */
  interpolate(
    from: number,
    to: number,
    progress: number,
    easing: EasingFunction = 'linear',
  ): number {
    const t = this.applyEasing(progress, easing);
    return from + (to - from) * t;
  }

  /**
   * Apply an easing function to a progress value.
   */
  applyEasing(t: number, easing: EasingFunction): number {
    switch (easing) {
      case 'linear':
        return t;
      case 'ease':
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      case 'ease-in':
        return t * t * t;
      case 'ease-out':
        return 1 - Math.pow(1 - t, 3);
      case 'ease-in-out':
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      case 'spring':
        return 1 - Math.pow(Math.cos(t * Math.PI * 4.5), 3) * Math.exp(-t * 6);
      case 'bounce':
        if (t < 1 / 2.75) return 7.5625 * t * t;
        if (t < 2 / 2.75) {
          const t2 = t - 1.5 / 2.75;
          return 7.5625 * t2 * t2 + 0.75;
        }
        if (t < 2.5 / 2.75) {
          const t2 = t - 2.25 / 2.75;
          return 7.5625 * t2 * t2 + 0.9375;
        }
        const t2 = t - 2.625 / 2.75;
        return 7.5625 * t2 * t2 + 0.984375;
    }
  }

  /**
   * Get all registered feedback IDs by type.
   */
  getFeedbacksByType(type: InteractionType): InteractionFeedback[] {
    const results: InteractionFeedback[] = [];
    for (const [, feedback] of this.feedbacks) {
      if (feedback.type === type) {
        results.push(feedback);
      }
    }
    return results;
  }

  /**
   * Get all parallax layers.
   */
  getParallaxLayers(): ParallaxLayer[] {
    return [...this.parallaxLayers];
  }

  /**
   * Get all scroll animations.
   */
  getScrollAnimations(): ScrollAnimation[] {
    return [...this.scrollAnimations];
  }

  /**
   * Reset all scroll animation triggers.
   */
  resetScrollAnimations(): void {
    for (const animation of this.scrollAnimations) {
      animation.hasTriggered = false;
    }
  }
}
