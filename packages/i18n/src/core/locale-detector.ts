// ============================================================================
// i18n - Locale Detector
// Multi-strategy locale detection with priority ordering
// ============================================================================

import type {
  SupportedLocale,
  LocaleDetectorConfig,
  Direction,
} from '../types';

const DEFAULT_CONFIG: LocaleDetectorConfig = {
  order: ['url', 'cookie', 'header', 'browser', 'default'],
  cookieName: 'locale',
  urlParam: 'lang',
  headerName: 'accept-language',
  defaultLocale: 'en',
  supportedLocales: ['en', 'hi', 'es', 'fr', 'ar', 'zh', 'ja', 'ko', 'de', 'pt', 'ru', 'it', 'tr', 'vi', 'th', 'id', 'nl', 'pl', 'sv', 'bn'],
};

/** Mapping of country codes to most likely locale */
const COUNTRY_LOCALE_MAP: Record<string, SupportedLocale> = {
  US: 'en', GB: 'en', AU: 'en', CA: 'en', NZ: 'en', IE: 'en',
  IN: 'hi', NP: 'hi',
  ES: 'es', MX: 'es', AR: 'es', CO: 'es', CL: 'es', PE: 'es',
  FR: 'fr', BE: 'fr', CH: 'fr',
  SA: 'ar', AE: 'ar', EG: 'ar', MA: 'ar', IQ: 'ar', JO: 'ar',
  CN: 'zh', TW: 'zh', HK: 'zh', SG: 'zh',
  JP: 'ja',
  KR: 'ko',
  DE: 'de', AT: 'de',
  BR: 'pt', PT: 'pt',
  RU: 'ru', BY: 'ru', KZ: 'ru',
  IT: 'it',
  TR: 'tr',
  VN: 'vi',
  TH: 'th',
  ID: 'id',
  NL: 'nl',
  PL: 'pl',
  SE: 'sv',
  BD: 'bn',
};

/**
 * LocaleDetector - Multi-strategy locale detection
 *
 * Detects user locale using configurable priority ordering of detection
 * strategies: URL parameter, cookies, Accept-Language header, browser
 * settings, IP geolocation, and fallback defaults.
 */
export class LocaleDetector {
  private config: LocaleDetectorConfig;
  private detectionCache: Map<string, SupportedLocale>;
  private ipLocaleCache: Map<string, SupportedLocale>;

  constructor(config: Partial<LocaleDetectorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.detectionCache = new Map();
    this.ipLocaleCache = new Map();
  }

  /** Detect locale using configured strategy order */
  detect(context: {
    url?: string;
    cookies?: Record<string, string>;
    headers?: Record<string, string>;
    browserLanguages?: string[];
    ip?: string;
  }): SupportedLocale {
    for (const strategy of this.config.order) {
      let detected: SupportedLocale | null = null;

      switch (strategy) {
        case 'url':
          detected = context.url ? this.fromUrl(context.url) : null;
          break;
        case 'cookie':
          detected = context.cookies ? this.fromCookie(context.cookies) : null;
          break;
        case 'header':
          detected = context.headers ? this.fromHeader(context.headers) : null;
          break;
        case 'browser':
          detected = context.browserLanguages ? this.fromBrowser(context.browserLanguages) : null;
          break;
        case 'ip':
          detected = context.ip ? this.fromIP(context.ip) : null;
          break;
        case 'default':
          detected = this.config.defaultLocale;
          break;
      }

      if (detected && this.isSupported(detected)) {
        return detected;
      }
    }

    return this.config.defaultLocale;
  }

  /** Detect from browser language preferences */
  fromBrowser(languages: string[]): SupportedLocale | null {
    for (const lang of languages) {
      const normalized = this.normalizeLocale(lang);
      if (normalized && this.isSupported(normalized)) {
        return normalized;
      }
    }
    return null;
  }

  /** Detect from Accept-Language header */
  fromHeader(headers: Record<string, string>): SupportedLocale | null {
    const acceptLanguage = headers[this.config.headerName] || headers['Accept-Language'] || headers['accept-language'];
    if (!acceptLanguage) return null;

    // Parse Accept-Language header: en-US,en;q=0.9,fr;q=0.8
    const locales = this.parseAcceptLanguage(acceptLanguage);

    for (const { locale } of locales) {
      const normalized = this.normalizeLocale(locale);
      if (normalized && this.isSupported(normalized)) {
        return normalized;
      }
    }

    return null;
  }

  /** Detect from cookie */
  fromCookie(cookies: Record<string, string>): SupportedLocale | null {
    const value = cookies[this.config.cookieName];
    if (!value) return null;

    const normalized = this.normalizeLocale(value);
    if (normalized && this.isSupported(normalized)) {
      return normalized;
    }
    return null;
  }

  /** Detect from URL parameter or path */
  fromUrl(url: string): SupportedLocale | null {
    // Check URL parameter
    try {
      const urlObj = new URL(url, 'http://localhost');
      const paramValue = urlObj.searchParams.get(this.config.urlParam);
      if (paramValue) {
        const normalized = this.normalizeLocale(paramValue);
        if (normalized && this.isSupported(normalized)) {
          return normalized;
        }
      }

      // Check URL path segments (e.g., /en/page, /fr/page)
      const pathSegments = urlObj.pathname.split('/').filter(Boolean);
      if (pathSegments.length > 0) {
        const firstSegment = pathSegments[0].toLowerCase();
        const normalized = this.normalizeLocale(firstSegment);
        if (normalized && this.isSupported(normalized)) {
          return normalized;
        }
      }
    } catch {
      // Not a valid URL, try as path
      const segments = url.split('/').filter(Boolean);
      if (segments.length > 0) {
        const normalized = this.normalizeLocale(segments[0]);
        if (normalized && this.isSupported(normalized)) {
          return normalized;
        }
      }
    }

    return null;
  }

  /** Detect locale from IP address (simulated geolocation) */
  fromIP(ip: string): SupportedLocale | null {
    // Check cache
    if (this.ipLocaleCache.has(ip)) {
      return this.ipLocaleCache.get(ip)!;
    }

    // Simulate IP geolocation by mapping IP ranges to countries
    const country = this.simulateGeoIP(ip);
    if (country) {
      const locale = COUNTRY_LOCALE_MAP[country];
      if (locale) {
        this.ipLocaleCache.set(ip, locale);
        return locale;
      }
    }

    return null;
  }

  /** Get fallback locale for a given locale */
  getFallback(locale: SupportedLocale): SupportedLocale {
    // Language family fallbacks
    const fallbacks: Partial<Record<SupportedLocale, SupportedLocale>> = {
      hi: 'en',
      bn: 'hi',
      es: 'en',
      fr: 'en',
      pt: 'es',
      it: 'es',
      de: 'en',
      nl: 'de',
      sv: 'en',
      pl: 'en',
      ru: 'en',
      ar: 'en',
      zh: 'en',
      ja: 'en',
      ko: 'en',
      tr: 'en',
      vi: 'en',
      th: 'en',
      id: 'en',
    };

    return fallbacks[locale] || this.config.defaultLocale;
  }

  /** Get all supported locales with metadata */
  getSupportedLocales(): { locale: SupportedLocale; name: string; nativeName: string; direction: Direction }[] {
    const localeInfo: Record<SupportedLocale, { name: string; nativeName: string; direction: Direction }> = {
      en: { name: 'English', nativeName: 'English', direction: 'ltr' },
      hi: { name: 'Hindi', nativeName: '\u0939\u093f\u0928\u094d\u0926\u0940', direction: 'ltr' },
      es: { name: 'Spanish', nativeName: 'Espa\u00f1ol', direction: 'ltr' },
      fr: { name: 'French', nativeName: 'Fran\u00e7ais', direction: 'ltr' },
      ar: { name: 'Arabic', nativeName: '\u0627\u0644\u0639\u0631\u0628\u064a\u0629', direction: 'rtl' },
      zh: { name: 'Chinese', nativeName: '\u4e2d\u6587', direction: 'ltr' },
      ja: { name: 'Japanese', nativeName: '\u65e5\u672c\u8a9e', direction: 'ltr' },
      ko: { name: 'Korean', nativeName: '\ud55c\uad6d\uc5b4', direction: 'ltr' },
      de: { name: 'German', nativeName: 'Deutsch', direction: 'ltr' },
      pt: { name: 'Portuguese', nativeName: 'Portugu\u00eas', direction: 'ltr' },
      ru: { name: 'Russian', nativeName: '\u0420\u0443\u0441\u0441\u043a\u0438\u0439', direction: 'ltr' },
      it: { name: 'Italian', nativeName: 'Italiano', direction: 'ltr' },
      tr: { name: 'Turkish', nativeName: 'T\u00fcrk\u00e7e', direction: 'ltr' },
      vi: { name: 'Vietnamese', nativeName: 'Ti\u1ebfng Vi\u1ec7t', direction: 'ltr' },
      th: { name: 'Thai', nativeName: '\u0e44\u0e17\u0e22', direction: 'ltr' },
      id: { name: 'Indonesian', nativeName: 'Bahasa Indonesia', direction: 'ltr' },
      nl: { name: 'Dutch', nativeName: 'Nederlands', direction: 'ltr' },
      pl: { name: 'Polish', nativeName: 'Polski', direction: 'ltr' },
      sv: { name: 'Swedish', nativeName: 'Svenska', direction: 'ltr' },
      bn: { name: 'Bengali', nativeName: '\u09ac\u09be\u0982\u09b2\u09be', direction: 'ltr' },
    };

    return this.config.supportedLocales.map(locale => ({
      locale,
      ...localeInfo[locale],
    }));
  }

  // --- Private Methods ---

  private normalizeLocale(input: string): SupportedLocale | null {
    const lower = input.toLowerCase().trim();

    // Direct match
    if (this.config.supportedLocales.includes(lower as SupportedLocale)) {
      return lower as SupportedLocale;
    }

    // Strip region (en-US -> en)
    const base = lower.split(/[-_]/)[0];
    if (this.config.supportedLocales.includes(base as SupportedLocale)) {
      return base as SupportedLocale;
    }

    return null;
  }

  private isSupported(locale: SupportedLocale): boolean {
    return this.config.supportedLocales.includes(locale);
  }

  private parseAcceptLanguage(header: string): { locale: string; quality: number }[] {
    return header.split(',')
      .map(part => {
        const [locale, qualityStr] = part.trim().split(';');
        const quality = qualityStr
          ? parseFloat(qualityStr.replace('q=', ''))
          : 1;
        return { locale: locale.trim(), quality };
      })
      .sort((a, b) => b.quality - a.quality);
  }

  private simulateGeoIP(ip: string): string | null {
    // Simulate by using IP octets as country indicators
    const parts = ip.split('.');
    if (parts.length !== 4) return null;
    const firstOctet = parseInt(parts[0], 10);

    // Simplified simulation based on first octet ranges
    if (firstOctet >= 1 && firstOctet <= 50) return 'US';
    if (firstOctet >= 51 && firstOctet <= 80) return 'GB';
    if (firstOctet >= 81 && firstOctet <= 100) return 'DE';
    if (firstOctet >= 101 && firstOctet <= 120) return 'FR';
    if (firstOctet >= 121 && firstOctet <= 140) return 'JP';
    if (firstOctet >= 141 && firstOctet <= 160) return 'IN';
    if (firstOctet >= 161 && firstOctet <= 180) return 'BR';
    if (firstOctet >= 181 && firstOctet <= 200) return 'RU';
    if (firstOctet >= 201 && firstOctet <= 220) return 'CN';
    if (firstOctet >= 221 && firstOctet <= 240) return 'KR';
    return null;
  }
}
