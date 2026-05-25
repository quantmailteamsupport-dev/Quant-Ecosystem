// ============================================================================
// Design Token System - Comprehensive Token Hierarchy and Resolution
// ============================================================================

interface SpacingScale {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  '2xl': number;
  '3xl': number;
  '4xl': number;
  '5xl': number;
  '6xl': number;
}

interface TypographyScale {
  xs: number;
  sm: number;
  base: number;
  lg: number;
  xl: number;
  '2xl': number;
  '3xl': number;
  '4xl': number;
  '5xl': number;
}

interface HSLColor {
  h: number;
  s: number;
  l: number;
  a?: number;
}

interface ColorPalette {
  primary: HSLColor;
  secondary: HSLColor;
  accent: HSLColor;
  neutral: HSLColor;
  success: HSLColor;
  warning: HSLColor;
  error: HSLColor;
  info: HSLColor;
}

interface ShadowToken {
  x: number;
  y: number;
  blur: number;
  spread: number;
  color: HSLColor;
}

interface MotionToken {
  duration: number;
  easing: string;
}

interface BorderRadiusScale {
  none: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  '2xl': number;
  full: number;
}

interface TokenTheme {
  name: string;
  colors: Partial<ColorPalette>;
  spacing?: Partial<SpacingScale>;
  typography?: Partial<TypographyScale>;
  shadows?: Partial<Record<string, ShadowToken>>;
  borderRadius?: Partial<BorderRadiusScale>;
}

interface TokenOverride {
  component?: string;
  instance?: string;
  tokens: Record<string, string | number>;
}

interface ContrastResult {
  ratio: number;
  passesAA: boolean;
  passesAAA: boolean;
  passesAALarge: boolean;
  passesAAALarge: boolean;
}

export class DesignTokenSystem {
  private baseSpacing: number = 4;
  private typographyRatio: number = 1.25;
  private typographyBase: number = 16;
  private colors: ColorPalette;
  private themes: Map<string, TokenTheme> = new Map();
  private currentTheme: string | null = null;
  private overrides: TokenOverride[] = [];

  // Spacing scale: 4px base (4, 8, 12, 16, 24, 32, 48, 64, 96, 128)
  private spacingScale: SpacingScale = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    '2xl': 32,
    '3xl': 48,
    '4xl': 64,
    '5xl': 96,
    '6xl': 128,
  };

  // Border radius scale
  private borderRadiusScale: BorderRadiusScale = {
    none: 0,
    sm: 2,
    md: 4,
    lg: 8,
    xl: 12,
    '2xl': 16,
    full: 9999,
  };

  // Shadows elevation system (0-5)
  private shadowElevations: ShadowToken[] = [
    { x: 0, y: 0, blur: 0, spread: 0, color: { h: 0, s: 0, l: 0, a: 0 } },
    { x: 0, y: 1, blur: 3, spread: 0, color: { h: 0, s: 0, l: 0, a: 0.1 } },
    { x: 0, y: 3, blur: 6, spread: -1, color: { h: 0, s: 0, l: 0, a: 0.12 } },
    { x: 0, y: 6, blur: 12, spread: -2, color: { h: 0, s: 0, l: 0, a: 0.15 } },
    { x: 0, y: 10, blur: 20, spread: -3, color: { h: 0, s: 0, l: 0, a: 0.18 } },
    { x: 0, y: 16, blur: 32, spread: -4, color: { h: 0, s: 0, l: 0, a: 0.22 } },
  ];

  // Motion tokens
  private motionTokens: Record<string, MotionToken> = {
    instant: { duration: 0, easing: 'linear' },
    fast: { duration: 150, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' },
    normal: { duration: 300, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' },
    slow: { duration: 500, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' },
    enter: { duration: 225, easing: 'cubic-bezier(0.0, 0, 0.2, 1)' },
    exit: { duration: 195, easing: 'cubic-bezier(0.4, 0, 1, 1)' },
    spring: { duration: 400, easing: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)' },
  };

  constructor(colors?: Partial<ColorPalette>) {
    this.colors = {
      primary: { h: 220, s: 90, l: 56 },
      secondary: { h: 260, s: 80, l: 60 },
      accent: { h: 340, s: 85, l: 55 },
      neutral: { h: 220, s: 10, l: 50 },
      success: { h: 145, s: 70, l: 42 },
      warning: { h: 38, s: 92, l: 50 },
      error: { h: 0, s: 84, l: 50 },
      info: { h: 200, s: 85, l: 50 },
      ...colors,
    };
  }

  /**
   * Get spacing value by key.
   */
  getSpacing(key: keyof SpacingScale): number {
    return this.spacingScale[key];
  }

  /**
   * Get spacing value by multiplier (multiples of base unit).
   */
  getSpacingByMultiplier(multiplier: number): number {
    return this.baseSpacing * multiplier;
  }

  /**
   * Get typography size using modular scale.
   * scale(n) = base * ratio^n
   * Produces: 16, 20, 25, 31.25, 39.06, ...
   */
  getTypographySize(step: number): number {
    const size = this.typographyBase * Math.pow(this.typographyRatio, step);
    return Math.round(size * 100) / 100;
  }

  /**
   * Get full typography scale.
   */
  getTypographyScale(): TypographyScale {
    return {
      xs: this.getTypographySize(-2),
      sm: this.getTypographySize(-1),
      base: this.getTypographySize(0),
      lg: this.getTypographySize(1),
      xl: this.getTypographySize(2),
      '2xl': this.getTypographySize(3),
      '3xl': this.getTypographySize(4),
      '4xl': this.getTypographySize(5),
      '5xl': this.getTypographySize(6),
    };
  }

  /**
   * Get line height for a given font size.
   * Uses golden ratio approximation: smaller text gets larger line-height ratio.
   */
  getLineHeight(fontSize: number): number {
    if (fontSize <= 14) return 1.7;
    if (fontSize <= 18) return 1.6;
    if (fontSize <= 24) return 1.5;
    if (fontSize <= 32) return 1.4;
    return 1.3;
  }

  /**
   * Get a color from the palette as HSL string.
   */
  getColor(name: keyof ColorPalette, lightness?: number): string {
    const color = this.colors[name];
    const l = lightness ?? color.l;
    const a = color.a;
    if (a !== undefined && a < 1) {
      return `hsla(${color.h}, ${color.s}%, ${l}%, ${a})`;
    }
    return `hsl(${color.h}, ${color.s}%, ${l}%)`;
  }

  /**
   * Generate color shade variants (100-900).
   */
  getColorShades(name: keyof ColorPalette): Record<number, string> {
    const base = this.colors[name];
    const shades: Record<number, string> = {};

    const lightnessValues = [95, 88, 78, 68, 56, 44, 34, 24, 16, 10];
    const levels = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];

    for (let i = 0; i < levels.length; i++) {
      const level = levels[i]!;
      const l = lightnessValues[i]!;
      shades[level] = `hsl(${base.h}, ${base.s}%, ${l}%)`;
    }

    return shades;
  }

  /**
   * Calculate WCAG contrast ratio between two colors.
   * Uses relative luminance: L = 0.2126*R + 0.7152*G + 0.0722*B
   */
  calculateContrastRatio(color1: HSLColor, color2: HSLColor): ContrastResult {
    const l1 = this.getRelativeLuminance(color1);
    const l2 = this.getRelativeLuminance(color2);

    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    const ratio = (lighter + 0.05) / (darker + 0.05);

    return {
      ratio: Math.round(ratio * 100) / 100,
      passesAA: ratio >= 4.5,
      passesAAA: ratio >= 7,
      passesAALarge: ratio >= 3,
      passesAAALarge: ratio >= 4.5,
    };
  }

  /**
   * Calculate relative luminance from an HSL color.
   * Converts HSL to RGB, applies gamma correction, then computes luminance.
   */
  getRelativeLuminance(color: HSLColor): number {
    const rgb = this.hslToRgb(color);

    // Apply gamma correction (linearize)
    const linearize = (c: number): number => {
      const srgb = c / 255;
      return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
    };

    const r = linearize(rgb.r);
    const g = linearize(rgb.g);
    const b = linearize(rgb.b);

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  /**
   * Convert HSL to RGB.
   */
  hslToRgb(color: HSLColor): { r: number; g: number; b: number } {
    const h = color.h / 360;
    const s = color.s / 100;
    const l = color.l / 100;

    if (s === 0) {
      const val = Math.round(l * 255);
      return { r: val, g: val, b: val };
    }

    const hue2rgb = (p: number, q: number, t: number): number => {
      let tn = t;
      if (tn < 0) tn += 1;
      if (tn > 1) tn -= 1;
      if (tn < 1 / 6) return p + (q - p) * 6 * tn;
      if (tn < 1 / 2) return q;
      if (tn < 2 / 3) return p + (q - p) * (2 / 3 - tn) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    return {
      r: Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
      g: Math.round(hue2rgb(p, q, h) * 255),
      b: Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
    };
  }

  /**
   * Find the best text color (black or white) for a background.
   */
  getAccessibleTextColor(background: HSLColor): HSLColor {
    const white: HSLColor = { h: 0, s: 0, l: 100 };
    const black: HSLColor = { h: 0, s: 0, l: 0 };

    const whiteContrast = this.calculateContrastRatio(background, white);
    const blackContrast = this.calculateContrastRatio(background, black);

    return whiteContrast.ratio > blackContrast.ratio ? white : black;
  }

  /**
   * Get shadow for a given elevation level (0-5).
   */
  getShadow(elevation: number): string {
    const clamped = Math.max(0, Math.min(5, elevation));
    const shadow = this.shadowElevations[clamped];
    if (!shadow || clamped === 0) return 'none';

    const { h, s, l, a } = shadow.color;
    const color = `hsla(${h}, ${s}%, ${l}%, ${a ?? 0.1})`;
    return `${shadow.x}px ${shadow.y}px ${shadow.blur}px ${shadow.spread}px ${color}`;
  }

  /**
   * Get border radius value.
   */
  getBorderRadius(key: keyof BorderRadiusScale): number {
    return this.borderRadiusScale[key];
  }

  /**
   * Get motion token.
   */
  getMotion(key: string): MotionToken | undefined {
    return this.motionTokens[key];
  }

  /**
   * Register a theme.
   */
  registerTheme(theme: TokenTheme): void {
    this.themes.set(theme.name, theme);
  }

  /**
   * Activate a theme.
   */
  setTheme(themeName: string): void {
    if (!this.themes.has(themeName)) {
      throw new Error(`Theme "${themeName}" not registered`);
    }
    this.currentTheme = themeName;
  }

  /**
   * Resolve a token value with theme override precedence:
   * base -> theme -> component -> instance
   */
  resolveToken(
    tokenPath: string,
    component?: string,
    instance?: string,
  ): string | number | undefined {
    // Check instance overrides first
    if (instance) {
      const instanceOverride = this.overrides.find((o) => o.instance === instance);
      if (instanceOverride && tokenPath in instanceOverride.tokens) {
        return instanceOverride.tokens[tokenPath];
      }
    }

    // Check component overrides
    if (component) {
      const componentOverride = this.overrides.find(
        (o) => o.component === component && !o.instance,
      );
      if (componentOverride && tokenPath in componentOverride.tokens) {
        return componentOverride.tokens[tokenPath];
      }
    }

    // Check theme overrides
    if (this.currentTheme) {
      const theme = this.themes.get(this.currentTheme);
      if (theme) {
        const themeValue = this.getThemeValue(theme, tokenPath);
        if (themeValue !== undefined) return themeValue;
      }
    }

    // Return base value
    return this.getBaseValue(tokenPath);
  }

  /**
   * Get a value from a theme.
   */
  private getThemeValue(theme: TokenTheme, path: string): string | number | undefined {
    const parts = path.split('.');
    const category = parts[0];
    const key = parts[1];

    if (category === 'colors' && key && theme.colors) {
      const colorKey = key as keyof ColorPalette;
      if (colorKey in (theme.colors as object)) {
        const color = theme.colors[colorKey];
        if (color) return `hsl(${color.h}, ${color.s}%, ${color.l}%)`;
      }
    }

    if (category === 'spacing' && key && theme.spacing) {
      const spacingKey = key as keyof SpacingScale;
      if (spacingKey in (theme.spacing as object)) {
        return theme.spacing[spacingKey];
      }
    }

    return undefined;
  }

  /**
   * Get a base token value.
   */
  private getBaseValue(path: string): string | number | undefined {
    const parts = path.split('.');
    const category = parts[0];
    const key = parts[1];

    if (category === 'spacing' && key) {
      const spacingKey = key as keyof SpacingScale;
      if (spacingKey in this.spacingScale) return this.spacingScale[spacingKey];
    }

    if (category === 'borderRadius' && key) {
      const radiusKey = key as keyof BorderRadiusScale;
      if (radiusKey in this.borderRadiusScale) return this.borderRadiusScale[radiusKey];
    }

    if (category === 'colors' && key) {
      const colorKey = key as keyof ColorPalette;
      if (colorKey in this.colors) {
        const color = this.colors[colorKey];
        return `hsl(${color.h}, ${color.s}%, ${color.l}%)`;
      }
    }

    return undefined;
  }

  /**
   * Add a token override for a component or instance.
   */
  addOverride(override: TokenOverride): void {
    this.overrides.push(override);
  }

  /**
   * Generate CSS custom properties from the token tree.
   */
  generateCssCustomProperties(): Record<string, string> {
    const properties: Record<string, string> = {};

    // Spacing
    for (const [key, value] of Object.entries(this.spacingScale)) {
      properties[`--spacing-${key}`] = `${value}px`;
    }

    // Typography
    const typoScale = this.getTypographyScale();
    for (const [key, value] of Object.entries(typoScale)) {
      properties[`--font-size-${key}`] = `${value}px`;
    }

    // Colors
    for (const [name, color] of Object.entries(this.colors)) {
      properties[`--color-${name}`] = `hsl(${color.h}, ${color.s}%, ${color.l}%)`;
      properties[`--color-${name}-h`] = `${color.h}`;
      properties[`--color-${name}-s`] = `${color.s}%`;
      properties[`--color-${name}-l`] = `${color.l}%`;
    }

    // Shadows
    for (let i = 0; i < this.shadowElevations.length; i++) {
      properties[`--shadow-${i}`] = this.getShadow(i);
    }

    // Border radius
    for (const [key, value] of Object.entries(this.borderRadiusScale)) {
      properties[`--radius-${key}`] = value === 9999 ? '9999px' : `${value}px`;
    }

    // Motion
    for (const [key, token] of Object.entries(this.motionTokens)) {
      properties[`--motion-${key}-duration`] = `${token.duration}ms`;
      properties[`--motion-${key}-easing`] = token.easing;
    }

    return properties;
  }

  /**
   * Generate CSS custom properties as a CSS string.
   */
  toCssString(selector: string = ':root'): string {
    const properties = this.generateCssCustomProperties();
    const lines = Object.entries(properties).map(([key, value]) => `  ${key}: ${value};`);
    return `${selector} {\n${lines.join('\n')}\n}`;
  }

  /**
   * Get the current color palette.
   */
  getColorPalette(): ColorPalette {
    return { ...this.colors };
  }

  /**
   * Update a color in the palette.
   */
  setColor(name: keyof ColorPalette, color: HSLColor): void {
    this.colors[name] = color;
  }

  /**
   * Get all registered theme names.
   */
  getThemeNames(): string[] {
    return Array.from(this.themes.keys());
  }

  /**
   * Get the current theme name.
   */
  getCurrentTheme(): string | null {
    return this.currentTheme;
  }
}
