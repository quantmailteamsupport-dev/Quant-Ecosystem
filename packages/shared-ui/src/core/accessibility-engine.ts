// ============================================================================
// Accessibility Engine - WCAG AAA Compliance and Assistive Technology Support
// ============================================================================

interface RGBColor {
  r: number;
  g: number;
  b: number;
}

interface ContrastCheckResult {
  ratio: number;
  passesAA: boolean;
  passesAAA: boolean;
  passesAALarge: boolean;
  passesAAALarge: boolean;
  minimumFontSizeForAA: number;
  minimumFontSizeForAAA: number;
}

interface FocusTrapConfig {
  containerId: string;
  initialFocusId?: string;
  returnFocusId: string;
  escapeDeactivates: boolean;
}

interface FocusTrapState {
  config: FocusTrapConfig;
  isActive: boolean;
  focusableElements: string[];
  currentIndex: number;
  previousFocus: string | null;
}

interface Announcement {
  id: string;
  message: string;
  priority: 'polite' | 'assertive';
  timestamp: number;
  clearAfterMs: number;
}

interface ReducedMotionConfig {
  prefersReducedMotion: boolean;
  alternativeAnimations: Map<string, AlternativeAnimation>;
}

interface AlternativeAnimation {
  original: string;
  reduced: string;
  description: string;
}

interface KeyboardNavConfig {
  containerId: string;
  orientation: 'horizontal' | 'vertical' | 'grid';
  wrap: boolean;
  rovingTabindex: boolean;
  homeEndKeys: boolean;
  typeAhead: boolean;
}

interface KeyboardNavState {
  config: KeyboardNavConfig;
  items: string[];
  activeIndex: number;
  typeAheadBuffer: string;
  typeAheadTimeout: number | null;
}

interface AriaLiveRegion {
  id: string;
  role: 'status' | 'alert' | 'log' | 'timer' | 'marquee';
  politeness: 'polite' | 'assertive' | 'off';
  atomic: boolean;
  relevant: ('additions' | 'removals' | 'text' | 'all')[];
  messages: string[];
}

type ColorBlindnessType = 'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia';

// Color matrix transforms for color blindness simulation
interface ColorMatrix {
  matrix: number[][];
}

export class AccessibilityEngine {
  private focusTraps: Map<string, FocusTrapState> = new Map();
  private announcements: Announcement[] = [];
  private reducedMotionConfig: ReducedMotionConfig;
  private keyboardNavs: Map<string, KeyboardNavState> = new Map();
  private liveRegions: Map<string, AriaLiveRegion> = new Map();
  private nextAnnouncementId: number = 1;

  // Color blindness simulation matrices
  private colorBlindnessMatrices: Record<ColorBlindnessType, ColorMatrix> = {
    protanopia: {
      matrix: [
        [0.567, 0.433, 0.0],
        [0.558, 0.442, 0.0],
        [0.0, 0.242, 0.758],
      ],
    },
    deuteranopia: {
      matrix: [
        [0.625, 0.375, 0.0],
        [0.7, 0.3, 0.0],
        [0.0, 0.3, 0.7],
      ],
    },
    tritanopia: {
      matrix: [
        [0.95, 0.05, 0.0],
        [0.0, 0.433, 0.567],
        [0.0, 0.475, 0.525],
      ],
    },
    achromatopsia: {
      matrix: [
        [0.299, 0.587, 0.114],
        [0.299, 0.587, 0.114],
        [0.299, 0.587, 0.114],
      ],
    },
  };

  constructor(prefersReducedMotion: boolean = false) {
    this.reducedMotionConfig = {
      prefersReducedMotion,
      alternativeAnimations: new Map(),
    };
  }

  // ========================================================================
  // WCAG AAA Contrast Checker
  // ========================================================================

  /**
   * Calculate relative luminance of an RGB color.
   * L = 0.2126*R + 0.7152*G + 0.0722*B
   * Where R, G, B are linearized (gamma corrected).
   */
  getRelativeLuminance(color: RGBColor): number {
    const linearize = (channel: number): number => {
      const srgb = channel / 255;
      return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
    };

    const r = linearize(color.r);
    const g = linearize(color.g);
    const b = linearize(color.b);

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  /**
   * Calculate contrast ratio between two colors.
   * ratio = (L1 + 0.05) / (L2 + 0.05) where L1 > L2
   * AAA requires 7:1 for normal text, 4.5:1 for large text.
   */
  checkContrast(foreground: RGBColor, background: RGBColor): ContrastCheckResult {
    const l1 = this.getRelativeLuminance(foreground);
    const l2 = this.getRelativeLuminance(background);

    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    const ratio = (lighter + 0.05) / (darker + 0.05);

    // Determine minimum font sizes for passing
    let minimumFontSizeForAA = 16;
    let minimumFontSizeForAAA = 16;

    if (ratio >= 7) {
      minimumFontSizeForAAA = 10; // Any size passes
      minimumFontSizeForAA = 10;
    } else if (ratio >= 4.5) {
      minimumFontSizeForAA = 10;
      minimumFontSizeForAAA = 18; // Only large text passes AAA
    } else if (ratio >= 3) {
      minimumFontSizeForAA = 18; // Only large text passes AA
      minimumFontSizeForAAA = Infinity; // Cannot pass AAA
    } else {
      minimumFontSizeForAA = Infinity;
      minimumFontSizeForAAA = Infinity;
    }

    return {
      ratio: Math.round(ratio * 100) / 100,
      passesAA: ratio >= 4.5,
      passesAAA: ratio >= 7,
      passesAALarge: ratio >= 3,
      passesAAALarge: ratio >= 4.5,
      minimumFontSizeForAA,
      minimumFontSizeForAAA,
    };
  }

  /**
   * Find the closest color that passes WCAG AAA contrast.
   * Adjusts lightness while preserving hue and saturation.
   */
  findAccessibleColor(color: RGBColor, background: RGBColor, targetRatio: number = 7): RGBColor {
    const bgLuminance = this.getRelativeLuminance(background);
    let bestColor = color;
    let bestDiff = Infinity;

    // Try adjusting the lightness
    for (let adjustment = 0; adjustment <= 255; adjustment++) {
      // Try darker
      const darker: RGBColor = {
        r: Math.max(0, color.r - adjustment),
        g: Math.max(0, color.g - adjustment),
        b: Math.max(0, color.b - adjustment),
      };
      const darkerLum = this.getRelativeLuminance(darker);
      const darkerRatio =
        bgLuminance > darkerLum
          ? (bgLuminance + 0.05) / (darkerLum + 0.05)
          : (darkerLum + 0.05) / (bgLuminance + 0.05);

      if (darkerRatio >= targetRatio) {
        const diff = Math.abs(darkerRatio - targetRatio);
        if (diff < bestDiff) {
          bestDiff = diff;
          bestColor = darker;
        }
        break;
      }

      // Try lighter
      const lighter: RGBColor = {
        r: Math.min(255, color.r + adjustment),
        g: Math.min(255, color.g + adjustment),
        b: Math.min(255, color.b + adjustment),
      };
      const lighterLum = this.getRelativeLuminance(lighter);
      const lighterRatio =
        lighterLum > bgLuminance
          ? (lighterLum + 0.05) / (bgLuminance + 0.05)
          : (bgLuminance + 0.05) / (lighterLum + 0.05);

      if (lighterRatio >= targetRatio) {
        const diff = Math.abs(lighterRatio - targetRatio);
        if (diff < bestDiff) {
          bestDiff = diff;
          bestColor = lighter;
        }
        break;
      }
    }

    return bestColor;
  }

  // ========================================================================
  // Focus Management
  // ========================================================================

  /**
   * Create and activate a focus trap within a container.
   */
  createFocusTrap(config: FocusTrapConfig, focusableElements: string[]): FocusTrapState {
    const state: FocusTrapState = {
      config,
      isActive: true,
      focusableElements,
      currentIndex: 0,
      previousFocus: config.returnFocusId,
    };

    this.focusTraps.set(config.containerId, state);
    return state;
  }

  /**
   * Handle tab key within a focus trap (circular navigation).
   */
  handleFocusTrapTab(containerId: string, shiftKey: boolean): string | null {
    const trap = this.focusTraps.get(containerId);
    if (!trap || !trap.isActive || trap.focusableElements.length === 0) return null;

    if (shiftKey) {
      trap.currentIndex -= 1;
      if (trap.currentIndex < 0) {
        trap.currentIndex = trap.focusableElements.length - 1;
      }
    } else {
      trap.currentIndex += 1;
      if (trap.currentIndex >= trap.focusableElements.length) {
        trap.currentIndex = 0;
      }
    }

    return trap.focusableElements[trap.currentIndex] ?? null;
  }

  /**
   * Deactivate a focus trap and restore previous focus.
   */
  deactivateFocusTrap(containerId: string): string | null {
    const trap = this.focusTraps.get(containerId);
    if (!trap) return null;

    trap.isActive = false;
    const returnFocus = trap.previousFocus;
    this.focusTraps.delete(containerId);
    return returnFocus;
  }

  /**
   * Get visible focus ring styles for an element.
   */
  getFocusRingStyles(variant: 'default' | 'inset' | 'offset' = 'default'): Record<string, string> {
    switch (variant) {
      case 'default':
        return {
          outline: '2px solid hsl(220, 90%, 56%)',
          'outline-offset': '2px',
          'border-radius': '2px',
        };
      case 'inset':
        return {
          outline: '2px solid hsl(220, 90%, 56%)',
          'outline-offset': '-2px',
        };
      case 'offset':
        return {
          outline: '3px solid hsl(220, 90%, 56%)',
          'outline-offset': '4px',
          'border-radius': '4px',
        };
    }
  }

  // ========================================================================
  // Screen Reader Announcements
  // ========================================================================

  /**
   * Queue a screen reader announcement.
   */
  announce(
    message: string,
    priority: 'polite' | 'assertive' = 'polite',
    clearAfterMs: number = 5000,
  ): Announcement {
    const announcement: Announcement = {
      id: `ann_${this.nextAnnouncementId++}`,
      message,
      priority,
      timestamp: Date.now(),
      clearAfterMs,
    };

    this.announcements.push(announcement);
    return announcement;
  }

  /**
   * Get pending announcements by priority.
   */
  getPendingAnnouncements(priority?: 'polite' | 'assertive'): Announcement[] {
    const now = Date.now();
    let filtered = this.announcements.filter((a) => now - a.timestamp < a.clearAfterMs);

    if (priority) {
      filtered = filtered.filter((a) => a.priority === priority);
    }

    return filtered;
  }

  /**
   * Clear expired announcements.
   */
  clearExpiredAnnouncements(): number {
    const now = Date.now();
    const before = this.announcements.length;
    this.announcements = this.announcements.filter((a) => now - a.timestamp < a.clearAfterMs);
    return before - this.announcements.length;
  }

  // ========================================================================
  // Reduced Motion
  // ========================================================================

  /**
   * Check if reduced motion is preferred.
   */
  prefersReducedMotion(): boolean {
    return this.reducedMotionConfig.prefersReducedMotion;
  }

  /**
   * Set reduced motion preference.
   */
  setReducedMotion(prefers: boolean): void {
    this.reducedMotionConfig.prefersReducedMotion = prefers;
  }

  /**
   * Register an alternative animation for reduced motion.
   */
  registerAlternativeAnimation(
    id: string,
    original: string,
    reduced: string,
    description: string,
  ): void {
    this.reducedMotionConfig.alternativeAnimations.set(id, {
      original,
      reduced,
      description,
    });
  }

  /**
   * Get the appropriate animation based on motion preference.
   */
  getAnimation(id: string): string | null {
    const alt = this.reducedMotionConfig.alternativeAnimations.get(id);
    if (!alt) return null;
    return this.reducedMotionConfig.prefersReducedMotion ? alt.reduced : alt.original;
  }

  /**
   * Get animation duration based on reduced motion preference.
   */
  getAnimationDuration(originalMs: number): number {
    if (this.reducedMotionConfig.prefersReducedMotion) {
      return 0; // Instant transitions
    }
    return originalMs;
  }

  // ========================================================================
  // Keyboard Navigation (Roving Tabindex)
  // ========================================================================

  /**
   * Create a keyboard navigation group.
   */
  createKeyboardNav(config: KeyboardNavConfig, items: string[]): KeyboardNavState {
    const state: KeyboardNavState = {
      config,
      items,
      activeIndex: 0,
      typeAheadBuffer: '',
      typeAheadTimeout: null,
    };

    this.keyboardNavs.set(config.containerId, state);
    return state;
  }

  /**
   * Handle arrow key navigation.
   * Returns the new active item ID or null if no change.
   */
  handleArrowNavigation(
    containerId: string,
    key: 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight' | 'Home' | 'End',
  ): string | null {
    const state = this.keyboardNavs.get(containerId);
    if (!state || state.items.length === 0) return null;

    const isForward =
      (state.config.orientation === 'vertical' && key === 'ArrowDown') ||
      (state.config.orientation === 'horizontal' && key === 'ArrowRight') ||
      (state.config.orientation === 'grid' && (key === 'ArrowRight' || key === 'ArrowDown'));

    const isBackward =
      (state.config.orientation === 'vertical' && key === 'ArrowUp') ||
      (state.config.orientation === 'horizontal' && key === 'ArrowLeft') ||
      (state.config.orientation === 'grid' && (key === 'ArrowLeft' || key === 'ArrowUp'));

    if (key === 'Home' && state.config.homeEndKeys) {
      state.activeIndex = 0;
      return state.items[0] ?? null;
    }

    if (key === 'End' && state.config.homeEndKeys) {
      state.activeIndex = state.items.length - 1;
      return state.items[state.activeIndex] ?? null;
    }

    if (isForward) {
      state.activeIndex += 1;
      if (state.activeIndex >= state.items.length) {
        state.activeIndex = state.config.wrap ? 0 : state.items.length - 1;
      }
    } else if (isBackward) {
      state.activeIndex -= 1;
      if (state.activeIndex < 0) {
        state.activeIndex = state.config.wrap ? state.items.length - 1 : 0;
      }
    }

    return state.items[state.activeIndex] ?? null;
  }

  /**
   * Get the tabindex value for an item in a roving tabindex group.
   */
  getTabIndex(containerId: string, itemIndex: number): number {
    const state = this.keyboardNavs.get(containerId);
    if (!state || !state.config.rovingTabindex) return 0;
    return state.activeIndex === itemIndex ? 0 : -1;
  }

  /**
   * Handle type-ahead in a keyboard navigation group.
   */
  handleTypeAhead(containerId: string, character: string, labels: string[]): string | null {
    const state = this.keyboardNavs.get(containerId);
    if (!state || !state.config.typeAhead) return null;

    state.typeAheadBuffer += character.toLowerCase();

    // Find matching item
    const matchIndex = labels.findIndex((label) =>
      label.toLowerCase().startsWith(state.typeAheadBuffer),
    );

    if (matchIndex !== -1) {
      state.activeIndex = matchIndex;
      return state.items[matchIndex] ?? null;
    }

    // Clear buffer after timeout (simulate with reset)
    state.typeAheadBuffer = character.toLowerCase();
    const singleMatch = labels.findIndex((label) =>
      label.toLowerCase().startsWith(state.typeAheadBuffer),
    );

    if (singleMatch !== -1) {
      state.activeIndex = singleMatch;
      return state.items[singleMatch] ?? null;
    }

    return null;
  }

  /**
   * Reset type-ahead buffer.
   */
  resetTypeAhead(containerId: string): void {
    const state = this.keyboardNavs.get(containerId);
    if (state) {
      state.typeAheadBuffer = '';
    }
  }

  // ========================================================================
  // ARIA Live Regions
  // ========================================================================

  /**
   * Register an ARIA live region.
   */
  registerLiveRegion(config: Omit<AriaLiveRegion, 'messages'>): void {
    this.liveRegions.set(config.id, { ...config, messages: [] });
  }

  /**
   * Update a live region with a new message.
   */
  updateLiveRegion(regionId: string, message: string): void {
    const region = this.liveRegions.get(regionId);
    if (!region) return;
    region.messages.push(message);
  }

  /**
   * Get ARIA attributes for a live region.
   */
  getLiveRegionAttributes(regionId: string): Record<string, string> | null {
    const region = this.liveRegions.get(regionId);
    if (!region) return null;

    return {
      role: region.role,
      'aria-live': region.politeness,
      'aria-atomic': region.atomic.toString(),
      'aria-relevant': region.relevant.join(' '),
    };
  }

  /**
   * Get the latest message from a live region.
   */
  getLatestMessage(regionId: string): string | null {
    const region = this.liveRegions.get(regionId);
    if (!region || region.messages.length === 0) return null;
    return region.messages[region.messages.length - 1] ?? null;
  }

  // ========================================================================
  // Color Blindness Simulation
  // ========================================================================

  /**
   * Simulate how a color appears to someone with a specific type of color blindness.
   * Uses color matrix transforms.
   */
  simulateColorBlindness(color: RGBColor, type: ColorBlindnessType): RGBColor {
    const matrixConfig = this.colorBlindnessMatrices[type];
    const matrix = matrixConfig.matrix;

    // Normalize to 0-1 range
    const r = color.r / 255;
    const g = color.g / 255;
    const b = color.b / 255;

    // Apply matrix transform
    const row0 = matrix[0];
    const row1 = matrix[1];
    const row2 = matrix[2];

    if (!row0 || !row1 || !row2) {
      return color;
    }

    const newR = (row0[0] ?? 0) * r + (row0[1] ?? 0) * g + (row0[2] ?? 0) * b;
    const newG = (row1[0] ?? 0) * r + (row1[1] ?? 0) * g + (row1[2] ?? 0) * b;
    const newB = (row2[0] ?? 0) * r + (row2[1] ?? 0) * g + (row2[2] ?? 0) * b;

    return {
      r: Math.round(Math.max(0, Math.min(1, newR)) * 255),
      g: Math.round(Math.max(0, Math.min(1, newG)) * 255),
      b: Math.round(Math.max(0, Math.min(1, newB)) * 255),
    };
  }

  /**
   * Check if a color pair is distinguishable for all color blindness types.
   */
  isUniversallyDistinguishable(
    color1: RGBColor,
    color2: RGBColor,
    threshold: number = 30,
  ): boolean {
    const types: ColorBlindnessType[] = ['protanopia', 'deuteranopia', 'tritanopia'];

    for (const type of types) {
      const sim1 = this.simulateColorBlindness(color1, type);
      const sim2 = this.simulateColorBlindness(color2, type);

      // Calculate Euclidean distance in RGB space
      const distance = Math.sqrt(
        (sim1.r - sim2.r) ** 2 + (sim1.g - sim2.g) ** 2 + (sim1.b - sim2.b) ** 2,
      );

      if (distance < threshold) return false;
    }

    return true;
  }

  /**
   * Get all supported color blindness types.
   */
  getSupportedColorBlindnessTypes(): ColorBlindnessType[] {
    return ['protanopia', 'deuteranopia', 'tritanopia', 'achromatopsia'];
  }
}
