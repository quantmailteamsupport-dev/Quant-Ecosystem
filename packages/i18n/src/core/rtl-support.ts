// ============================================================================
// i18n - RTL Support
// Full RTL utilities with CSS property flipping and layout mirroring
// ============================================================================

import type {
  SupportedLocale,
  Direction,
} from '../types';

interface RTLConfig {
  rtlLocales: SupportedLocale[];
  enableAutoFlip: boolean;
  excludeProperties: string[];
}

const DEFAULT_CONFIG: RTLConfig = {
  rtlLocales: ['ar'],
  enableAutoFlip: true,
  excludeProperties: ['background-position-x', 'animation-direction'],
};

/** CSS properties that need flipping for RTL */
const DIRECTIONAL_PROPERTIES: Record<string, string> = {
  'margin-left': 'margin-right',
  'margin-right': 'margin-left',
  'padding-left': 'padding-right',
  'padding-right': 'padding-left',
  'border-left': 'border-right',
  'border-right': 'border-left',
  'border-left-width': 'border-right-width',
  'border-right-width': 'border-left-width',
  'border-left-color': 'border-right-color',
  'border-right-color': 'border-left-color',
  'border-left-style': 'border-right-style',
  'border-right-style': 'border-left-style',
  'border-top-left-radius': 'border-top-right-radius',
  'border-top-right-radius': 'border-top-left-radius',
  'border-bottom-left-radius': 'border-bottom-right-radius',
  'border-bottom-right-radius': 'border-bottom-left-radius',
  'left': 'right',
  'right': 'left',
  'float': 'float',
  'clear': 'clear',
  'text-align': 'text-align',
};

/** CSS value mappings for RTL */
const VALUE_FLIPS: Record<string, string> = {
  'left': 'right',
  'right': 'left',
  'ltr': 'rtl',
  'rtl': 'ltr',
};

/**
 * RTLSupport - Right-to-left layout utilities
 *
 * Provides comprehensive RTL support including direction detection,
 * CSS property flipping, layout mirroring, alignment transformation,
 * and translation text direction handling.
 */
export class RTLSupport {
  private config: RTLConfig;
  private directionCache: Map<SupportedLocale, Direction>;

  constructor(config: Partial<RTLConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.directionCache = new Map();
    this.initializeDirectionCache();
  }

  /** Check if a locale uses RTL direction */
  isRTL(locale: SupportedLocale): boolean {
    return this.config.rtlLocales.includes(locale);
  }

  /** Get text direction for a locale */
  getDirection(locale: SupportedLocale): Direction {
    return this.directionCache.get(locale) || 'ltr';
  }

  /** Flip a CSS property for RTL layout */
  flipLayout(styles: Record<string, string>, locale: SupportedLocale): Record<string, string> {
    if (!this.isRTL(locale)) return { ...styles };
    if (!this.config.enableAutoFlip) return { ...styles };

    const flipped: Record<string, string> = {};

    for (const [property, value] of Object.entries(styles)) {
      if (this.config.excludeProperties.includes(property)) {
        flipped[property] = value;
        continue;
      }

      // Flip property name
      const flippedProperty = DIRECTIONAL_PROPERTIES[property] || property;

      // Flip value if it's a directional value
      let flippedValue = value;
      if (['float', 'clear', 'text-align'].includes(property)) {
        flippedValue = VALUE_FLIPS[value] || value;
      }

      // Handle shorthand properties (e.g., margin: 0 10px 0 20px -> margin: 0 20px 0 10px)
      if (this.isShorthandProperty(property)) {
        flippedValue = this.flipShorthandValue(value);
      }

      // Handle transform with translateX
      if (property === 'transform') {
        flippedValue = this.flipTransform(value);
      }

      // Handle background-position
      if (property === 'background-position') {
        flippedValue = this.flipBackgroundPosition(value);
      }

      flipped[flippedProperty] = flippedValue;
    }

    // Add direction property
    flipped['direction'] = 'rtl';

    return flipped;
  }

  /** Mirror CSS stylesheet rules for RTL */
  mirrorCSS(css: string, locale: SupportedLocale): string {
    if (!this.isRTL(locale)) return css;

    let mirrored = css;

    // Flip directional properties
    for (const [ltr, rtl] of Object.entries(DIRECTIONAL_PROPERTIES)) {
      if (ltr === rtl) continue;
      const placeholder = `__${ltr.replace(/-/g, '_')}__`;
      mirrored = mirrored.replace(new RegExp(this.escapeRegex(ltr), 'g'), placeholder);
    }

    // Replace placeholders with flipped values
    for (const [ltr, rtl] of Object.entries(DIRECTIONAL_PROPERTIES)) {
      if (ltr === rtl) continue;
      const placeholder = `__${ltr.replace(/-/g, '_')}__`;
      mirrored = mirrored.replace(new RegExp(this.escapeRegex(placeholder), 'g'), rtl);
    }

    // Flip directional values
    mirrored = mirrored.replace(/\btext-align:\s*(left|right)/g, (match, align) => {
      return `text-align: ${VALUE_FLIPS[align] || align}`;
    });

    mirrored = mirrored.replace(/\bfloat:\s*(left|right)/g, (match, dir) => {
      return `float: ${VALUE_FLIPS[dir] || dir}`;
    });

    return mirrored;
  }

  /** Get alignment values for current direction */
  getAlignments(locale: SupportedLocale): {
    start: 'left' | 'right';
    end: 'left' | 'right';
    textAlign: 'left' | 'right';
    flexDirection: 'row' | 'row-reverse';
    marginStart: 'margin-left' | 'margin-right';
    marginEnd: 'margin-left' | 'margin-right';
    paddingStart: 'padding-left' | 'padding-right';
    paddingEnd: 'padding-left' | 'padding-right';
  } {
    const isRTL = this.isRTL(locale);
    return {
      start: isRTL ? 'right' : 'left',
      end: isRTL ? 'left' : 'right',
      textAlign: isRTL ? 'right' : 'left',
      flexDirection: isRTL ? 'row-reverse' : 'row',
      marginStart: isRTL ? 'margin-right' : 'margin-left',
      marginEnd: isRTL ? 'margin-left' : 'margin-right',
      paddingStart: isRTL ? 'padding-right' : 'padding-left',
      paddingEnd: isRTL ? 'padding-left' : 'padding-right',
    };
  }

  /** Transform translation text for proper RTL display */
  transformTranslation(text: string, locale: SupportedLocale): string {
    if (!this.isRTL(locale)) return text;

    // Add Unicode bidi markers for mixed content
    const hasLTR = /[a-zA-Z0-9]/.test(text);
    const hasRTL = /[\u0600-\u06FF\u0750-\u077F\u0590-\u05FF]/.test(text);

    if (hasLTR && hasRTL) {
      // Wrap LTR segments with directional isolate markers
      return text.replace(/([a-zA-Z0-9][a-zA-Z0-9\s.,!?@#$%^&*()_+\-=]*[a-zA-Z0-9])/g,
        '\u2066$1\u2069'
      );
    }

    return text;
  }

  /** Get HTML attributes for RTL support */
  getHtmlAttributes(locale: SupportedLocale): { dir: Direction; lang: string } {
    return {
      dir: this.getDirection(locale),
      lang: locale,
    };
  }

  /** Generate CSS custom properties for directional layout */
  getCSSCustomProperties(locale: SupportedLocale): Record<string, string> {
    const isRTL = this.isRTL(locale);
    return {
      '--direction': isRTL ? 'rtl' : 'ltr',
      '--start': isRTL ? 'right' : 'left',
      '--end': isRTL ? 'left' : 'right',
      '--text-align': isRTL ? 'right' : 'left',
      '--flex-row': isRTL ? 'row-reverse' : 'row',
      '--float-start': isRTL ? 'right' : 'left',
      '--float-end': isRTL ? 'left' : 'right',
      '--transform-flip': isRTL ? 'scaleX(-1)' : 'none',
    };
  }

  // --- Private Methods ---

  private initializeDirectionCache(): void {
    const allLocales: SupportedLocale[] = ['en', 'hi', 'es', 'fr', 'ar', 'zh', 'ja', 'ko', 'de', 'pt', 'ru', 'it', 'tr', 'vi', 'th', 'id', 'nl', 'pl', 'sv', 'bn'];
    for (const locale of allLocales) {
      this.directionCache.set(locale, this.config.rtlLocales.includes(locale) ? 'rtl' : 'ltr');
    }
  }

  private isShorthandProperty(property: string): boolean {
    return ['margin', 'padding', 'border-width', 'border-color', 'border-style', 'border-radius'].includes(property);
  }

  private flipShorthandValue(value: string): string {
    const parts = value.trim().split(/\s+/);
    if (parts.length === 4) {
      // top right bottom left -> top left bottom right
      return `${parts[0]} ${parts[3]} ${parts[2]} ${parts[1]}`;
    }
    return value;
  }

  private flipTransform(value: string): string {
    // Negate translateX values
    return value.replace(/translateX\(([^)]+)\)/g, (match, val) => {
      if (val.startsWith('-')) {
        return `translateX(${val.substring(1)})`;
      }
      return `translateX(-${val})`;
    });
  }

  private flipBackgroundPosition(value: string): string {
    return value
      .replace(/\bleft\b/g, '__RIGHT__')
      .replace(/\bright\b/g, 'left')
      .replace(/__RIGHT__/g, 'right');
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
