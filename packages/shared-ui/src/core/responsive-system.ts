// ============================================================================
// Responsive System - Breakpoints, Fluid Typography, and Adaptive Layouts
// ============================================================================

type BreakpointName = 'mobile' | 'tablet' | 'desktop' | 'wide';

interface Breakpoint {
  name: BreakpointName;
  minWidth: number;
  maxWidth: number;
}

interface ContainerQuery {
  id: string;
  containerName: string;
  conditions: ContainerCondition[];
  variants: ComponentVariant[];
}

interface ContainerCondition {
  property: 'width' | 'height' | 'aspect-ratio';
  operator: 'min' | 'max' | 'equals';
  value: number;
}

interface ComponentVariant {
  name: string;
  condition: ContainerCondition;
  styles: Record<string, string | number>;
}

interface FluidTypographyConfig {
  minFontSize: number;
  maxFontSize: number;
  minViewportWidth: number;
  maxViewportWidth: number;
}

interface ResponsiveSpacingConfig {
  baseScale: number[];
  scaleFactor: Record<BreakpointName, number>;
}

interface AspectRatioLock {
  id: string;
  width: number;
  height: number;
  maxWidth?: number;
  minWidth?: number;
}

interface AdaptiveVariant {
  name: string;
  minWidth: number;
  maxWidth: number;
  layout: 'stack' | 'grid' | 'inline' | 'sidebar' | 'masonry';
  columns?: number;
  gap?: number;
  padding?: number;
}

interface LayoutShiftMetrics {
  elementId: string;
  expectedAspectRatio: number;
  reservedHeight: number;
  isLoaded: boolean;
}

interface ResponsiveValue<T> {
  mobile: T;
  tablet: T;
  desktop: T;
  wide: T;
}

export class ResponsiveSystem {
  private breakpoints: Breakpoint[] = [
    { name: 'mobile', minWidth: 0, maxWidth: 767 },
    { name: 'tablet', minWidth: 768, maxWidth: 1023 },
    { name: 'desktop', minWidth: 1024, maxWidth: 1439 },
    { name: 'wide', minWidth: 1440, maxWidth: Infinity },
  ];

  private containerQueries: Map<string, ContainerQuery> = new Map();
  private aspectRatioLocks: Map<string, AspectRatioLock> = new Map();
  private adaptiveVariants: Map<string, AdaptiveVariant[]> = new Map();
  private layoutShiftMetrics: Map<string, LayoutShiftMetrics> = new Map();
  private currentViewportWidth: number = 1024;
  private currentViewportHeight: number = 768;

  private spacingConfig: ResponsiveSpacingConfig = {
    baseScale: [4, 8, 12, 16, 24, 32, 48, 64, 96, 128],
    scaleFactor: {
      mobile: 0.75,
      tablet: 0.875,
      desktop: 1.0,
      wide: 1.125,
    },
  };

  constructor(viewportWidth?: number, viewportHeight?: number) {
    if (viewportWidth !== undefined) this.currentViewportWidth = viewportWidth;
    if (viewportHeight !== undefined) this.currentViewportHeight = viewportHeight;
  }

  /**
   * Get the current breakpoint based on viewport width.
   */
  getCurrentBreakpoint(): BreakpointName {
    return this.getBreakpointForWidth(this.currentViewportWidth);
  }

  /**
   * Get the breakpoint for a given width.
   */
  getBreakpointForWidth(width: number): BreakpointName {
    for (const bp of this.breakpoints) {
      if (width >= bp.minWidth && width <= bp.maxWidth) {
        return bp.name;
      }
    }
    return 'desktop';
  }

  /**
   * Check if the current viewport matches a breakpoint.
   */
  isBreakpoint(name: BreakpointName): boolean {
    return this.getCurrentBreakpoint() === name;
  }

  /**
   * Check if viewport is at or above a breakpoint.
   */
  isAtLeast(name: BreakpointName): boolean {
    const bp = this.breakpoints.find((b) => b.name === name);
    if (!bp) return false;
    return this.currentViewportWidth >= bp.minWidth;
  }

  /**
   * Check if viewport is at or below a breakpoint.
   */
  isAtMost(name: BreakpointName): boolean {
    const bp = this.breakpoints.find((b) => b.name === name);
    if (!bp) return false;
    return this.currentViewportWidth <= bp.maxWidth;
  }

  /**
   * Update viewport dimensions.
   */
  setViewport(width: number, height: number): void {
    this.currentViewportWidth = width;
    this.currentViewportHeight = height;
  }

  /**
   * Get a responsive value based on current breakpoint.
   */
  getResponsiveValue<T>(values: ResponsiveValue<T>): T {
    const bp = this.getCurrentBreakpoint();
    return values[bp];
  }

  /**
   * Generate CSS media query for a breakpoint.
   */
  getMediaQuery(name: BreakpointName): string {
    const bp = this.breakpoints.find((b) => b.name === name);
    if (!bp) return '';

    if (bp.maxWidth === Infinity) {
      return `@media (min-width: ${bp.minWidth}px)`;
    }
    return `@media (min-width: ${bp.minWidth}px) and (max-width: ${bp.maxWidth}px)`;
  }

  /**
   * Generate CSS media query for "up" (min-width only).
   */
  getMediaQueryUp(name: BreakpointName): string {
    const bp = this.breakpoints.find((b) => b.name === name);
    if (!bp) return '';
    return `@media (min-width: ${bp.minWidth}px)`;
  }

  /**
   * Generate CSS media query for "down" (max-width only).
   */
  getMediaQueryDown(name: BreakpointName): string {
    const bp = this.breakpoints.find((b) => b.name === name);
    if (!bp) return '';
    return `@media (max-width: ${bp.maxWidth}px)`;
  }

  // ========================================================================
  // Container Queries
  // ========================================================================

  /**
   * Register a container query.
   */
  registerContainerQuery(query: ContainerQuery): void {
    this.containerQueries.set(query.id, query);
  }

  /**
   * Evaluate container queries for a given container width.
   */
  evaluateContainerQuery(
    queryId: string,
    containerWidth: number,
    containerHeight?: number,
  ): ComponentVariant | null {
    const query = this.containerQueries.get(queryId);
    if (!query) return null;

    // Find the matching variant (last match wins)
    let matchedVariant: ComponentVariant | null = null;

    for (const variant of query.variants) {
      const condition = variant.condition;
      let value: number;

      switch (condition.property) {
        case 'width':
          value = containerWidth;
          break;
        case 'height':
          value = containerHeight ?? 0;
          break;
        case 'aspect-ratio':
          value = containerHeight ? containerWidth / containerHeight : 0;
          break;
      }

      let matches = false;
      switch (condition.operator) {
        case 'min':
          matches = value >= condition.value;
          break;
        case 'max':
          matches = value <= condition.value;
          break;
        case 'equals':
          matches = Math.abs(value - condition.value) < 0.01;
          break;
      }

      if (matches) {
        matchedVariant = variant;
      }
    }

    return matchedVariant;
  }

  /**
   * Generate CSS container query string.
   */
  generateContainerQueryCSS(queryId: string): string {
    const query = this.containerQueries.get(queryId);
    if (!query) return '';

    const rules: string[] = [];

    for (const variant of query.variants) {
      const { property, operator, value } = variant.condition;
      const cssOperator = operator === 'min' ? 'min-' : operator === 'max' ? 'max-' : '';
      const cssProperty = property === 'aspect-ratio' ? 'aspect-ratio' : property;

      const styles = Object.entries(variant.styles)
        .map(([k, v]) => `    ${this.camelToKebab(k)}: ${typeof v === 'number' ? `${v}px` : v};`)
        .join('\n');

      rules.push(
        `@container ${query.containerName} (${cssOperator}${cssProperty}: ${value}${cssProperty === 'aspect-ratio' ? '' : 'px'}) {\n  .${variant.name} {\n${styles}\n  }\n}`,
      );
    }

    return rules.join('\n\n');
  }

  // ========================================================================
  // Fluid Typography
  // ========================================================================

  /**
   * Calculate fluid typography using clamp().
   * preferred = min + (max - min) * (vw - minWidth) / (maxWidth - minWidth)
   */
  getFluidTypography(config: FluidTypographyConfig): string {
    const { minFontSize, maxFontSize, minViewportWidth, maxViewportWidth } = config;

    // Calculate the slope
    const slope = (maxFontSize - minFontSize) / (maxViewportWidth - minViewportWidth);
    const yIntercept = minFontSize - slope * minViewportWidth;

    // Convert to vw units
    const preferredVw = slope * 100;
    const preferredRem = yIntercept / 16;

    const minRem = minFontSize / 16;
    const maxRem = maxFontSize / 16;

    return `clamp(${minRem}rem, ${preferredRem.toFixed(4)}rem + ${preferredVw.toFixed(4)}vw, ${maxRem}rem)`;
  }

  /**
   * Calculate the fluid font size at the current viewport width.
   */
  calculateFluidFontSize(config: FluidTypographyConfig): number {
    const { minFontSize, maxFontSize, minViewportWidth, maxViewportWidth } = config;

    if (this.currentViewportWidth <= minViewportWidth) return minFontSize;
    if (this.currentViewportWidth >= maxViewportWidth) return maxFontSize;

    const progress =
      (this.currentViewportWidth - minViewportWidth) / (maxViewportWidth - minViewportWidth);
    return minFontSize + (maxFontSize - minFontSize) * progress;
  }

  /**
   * Generate fluid typography scale for common text elements.
   */
  generateFluidScale(): Record<string, string> {
    const scale: Record<string, string> = {};

    const configs: Array<{ name: string; min: number; max: number }> = [
      { name: 'caption', min: 10, max: 12 },
      { name: 'body-sm', min: 12, max: 14 },
      { name: 'body', min: 14, max: 16 },
      { name: 'body-lg', min: 16, max: 18 },
      { name: 'h6', min: 16, max: 20 },
      { name: 'h5', min: 18, max: 24 },
      { name: 'h4', min: 22, max: 30 },
      { name: 'h3', min: 26, max: 36 },
      { name: 'h2', min: 32, max: 48 },
      { name: 'h1', min: 40, max: 64 },
      { name: 'display', min: 48, max: 80 },
    ];

    for (const config of configs) {
      scale[config.name] = this.getFluidTypography({
        minFontSize: config.min,
        maxFontSize: config.max,
        minViewportWidth: 320,
        maxViewportWidth: 1440,
      });
    }

    return scale;
  }

  // ========================================================================
  // Responsive Spacing
  // ========================================================================

  /**
   * Get responsive spacing value that scales with viewport.
   */
  getResponsiveSpacing(index: number): number {
    const baseValue = this.spacingConfig.baseScale[index] ?? 0;
    const bp = this.getCurrentBreakpoint();
    const factor = this.spacingConfig.scaleFactor[bp];
    return Math.round(baseValue * factor);
  }

  /**
   * Get all responsive spacing values for the current breakpoint.
   */
  getResponsiveSpacingScale(): number[] {
    const bp = this.getCurrentBreakpoint();
    const factor = this.spacingConfig.scaleFactor[bp];
    return this.spacingConfig.baseScale.map((v) => Math.round(v * factor));
  }

  /**
   * Calculate fluid spacing between two values based on viewport.
   */
  getFluidSpacing(minPx: number, maxPx: number): number {
    const minVw = 320;
    const maxVw = 1440;

    if (this.currentViewportWidth <= minVw) return minPx;
    if (this.currentViewportWidth >= maxVw) return maxPx;

    const progress = (this.currentViewportWidth - minVw) / (maxVw - minVw);
    return Math.round(minPx + (maxPx - minPx) * progress);
  }

  // ========================================================================
  // Layout Shift Prevention
  // ========================================================================

  /**
   * Register an aspect ratio lock for an element.
   */
  registerAspectRatioLock(lock: AspectRatioLock): void {
    this.aspectRatioLocks.set(lock.id, lock);
  }

  /**
   * Calculate the height for an element based on its aspect ratio and available width.
   */
  calculateAspectRatioHeight(lockId: string, availableWidth: number): number {
    const lock = this.aspectRatioLocks.get(lockId);
    if (!lock) return 0;

    const effectiveWidth = Math.max(
      lock.minWidth ?? 0,
      Math.min(lock.maxWidth ?? Infinity, availableWidth),
    );

    return Math.round((effectiveWidth * lock.height) / lock.width);
  }

  /**
   * Get CSS for preventing layout shift (reserve space).
   */
  getLayoutShiftPreventionCSS(lockId: string): Record<string, string> {
    const lock = this.aspectRatioLocks.get(lockId);
    if (!lock) return {};

    const paddingTop = (lock.height / lock.width) * 100;

    return {
      position: 'relative',
      width: '100%',
      'padding-top': `${paddingTop.toFixed(4)}%`,
      overflow: 'hidden',
    };
  }

  /**
   * Track layout shift metrics for an element.
   */
  trackLayoutShift(
    elementId: string,
    aspectRatio: number,
    containerWidth: number,
  ): LayoutShiftMetrics {
    const reservedHeight = Math.round(containerWidth / aspectRatio);

    const metrics: LayoutShiftMetrics = {
      elementId,
      expectedAspectRatio: aspectRatio,
      reservedHeight,
      isLoaded: false,
    };

    this.layoutShiftMetrics.set(elementId, metrics);
    return metrics;
  }

  /**
   * Mark an element as loaded (no longer needs placeholder space).
   */
  markLoaded(elementId: string): void {
    const metrics = this.layoutShiftMetrics.get(elementId);
    if (metrics) {
      metrics.isLoaded = true;
    }
  }

  // ========================================================================
  // Adaptive Component Variants
  // ========================================================================

  /**
   * Register adaptive variants for a component.
   */
  registerAdaptiveVariants(componentId: string, variants: AdaptiveVariant[]): void {
    // Sort by minWidth ascending for proper matching
    const sorted = [...variants].sort((a, b) => a.minWidth - b.minWidth);
    this.adaptiveVariants.set(componentId, sorted);
  }

  /**
   * Select the best variant for a component based on available space.
   */
  selectVariant(componentId: string, availableWidth: number): AdaptiveVariant | null {
    const variants = this.adaptiveVariants.get(componentId);
    if (!variants || variants.length === 0) return null;

    // Find the variant that matches the available width
    let selected: AdaptiveVariant | null = null;

    for (const variant of variants) {
      if (availableWidth >= variant.minWidth && availableWidth <= variant.maxWidth) {
        selected = variant;
      }
    }

    // Fallback to the closest variant
    if (!selected) {
      selected = variants[0] ?? null;
      for (const variant of variants) {
        if (availableWidth >= variant.minWidth) {
          selected = variant;
        }
      }
    }

    return selected;
  }

  /**
   * Get grid layout properties for a variant.
   */
  getGridProperties(variant: AdaptiveVariant): Record<string, string> {
    const properties: Record<string, string> = {};

    switch (variant.layout) {
      case 'grid':
        properties['display'] = 'grid';
        properties['grid-template-columns'] = `repeat(${variant.columns ?? 1}, 1fr)`;
        properties['gap'] = `${variant.gap ?? 16}px`;
        properties['padding'] = `${variant.padding ?? 0}px`;
        break;
      case 'stack':
        properties['display'] = 'flex';
        properties['flex-direction'] = 'column';
        properties['gap'] = `${variant.gap ?? 16}px`;
        break;
      case 'inline':
        properties['display'] = 'flex';
        properties['flex-direction'] = 'row';
        properties['flex-wrap'] = 'wrap';
        properties['gap'] = `${variant.gap ?? 16}px`;
        break;
      case 'sidebar':
        properties['display'] = 'grid';
        properties['grid-template-columns'] = '250px 1fr';
        properties['gap'] = `${variant.gap ?? 24}px`;
        break;
      case 'masonry':
        properties['columns'] = `${variant.columns ?? 2}`;
        properties['column-gap'] = `${variant.gap ?? 16}px`;
        break;
    }

    return properties;
  }

  /**
   * Get the current viewport dimensions.
   */
  getViewport(): { width: number; height: number } {
    return { width: this.currentViewportWidth, height: this.currentViewportHeight };
  }

  /**
   * Get all breakpoints.
   */
  getBreakpoints(): Breakpoint[] {
    return [...this.breakpoints];
  }

  /**
   * Utility: Convert camelCase to kebab-case.
   */
  private camelToKebab(str: string): string {
    return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  }
}
