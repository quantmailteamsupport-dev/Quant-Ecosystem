// ============================================================================
// i18n - Translation Manager
// Full translation system with namespace support and interpolation
// ============================================================================

import type {
  SupportedLocale,
  TranslationNamespace,
  TranslationManagerConfig,
  InterpolationOptions,
  MissingTranslationHandler,
  LocaleTranslations,
  PluralCategory,
  PluralRule,
} from '../types';

const DEFAULT_INTERPOLATION: InterpolationOptions = {
  prefix: '{{',
  suffix: '}}',
  escapeValue: true,
  skipOnMissing: false,
};

const DEFAULT_MISSING_HANDLER: MissingTranslationHandler = (key, locale) => {
  return `[${locale}:${key}]`;
};

const DEFAULT_CONFIG: TranslationManagerConfig = {
  defaultLocale: 'en',
  fallbackLocale: 'en',
  supportedLocales: ['en', 'hi', 'es', 'fr', 'ar', 'zh', 'ja', 'ko', 'de', 'pt', 'ru', 'it', 'tr', 'vi', 'th', 'id', 'nl', 'pl', 'sv', 'bn'],
  interpolation: DEFAULT_INTERPOLATION,
  missingHandler: DEFAULT_MISSING_HANDLER,
  enableCaching: true,
  namespaces: ['common', 'auth', 'navigation', 'errors', 'notifications', 'settings', 'profile', 'chat', 'media', 'payments', 'moderation', 'search', 'ads'],
};

/**
 * TranslationManager - Core i18n translation engine
 *
 * Provides translation lookup with namespace support, nested key resolution,
 * variable interpolation, pluralization, caching, and fallback chains.
 */
export class TranslationManager {
  private config: TranslationManagerConfig;
  private currentLocale: SupportedLocale;
  private translations: Map<string, Map<string, string>>;
  private pluralRules: Map<SupportedLocale, PluralRule>;
  private cache: Map<string, string>;
  private missingKeys: Map<string, Set<string>>;
  private loadedNamespaces: Map<string, Set<TranslationNamespace>>;

  constructor(config: Partial<TranslationManagerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.currentLocale = this.config.defaultLocale;
    this.translations = new Map();
    this.pluralRules = new Map();
    this.cache = new Map();
    this.missingKeys = new Map();
    this.loadedNamespaces = new Map();
    this.initializeDefaultPluralRules();
  }

  /** Translate a key with optional interpolation and pluralization */
  t(key: string, options?: {
    locale?: SupportedLocale;
    namespace?: TranslationNamespace;
    count?: number;
    values?: Record<string, string | number>;
    defaultValue?: string;
  }): string {
    const locale = options?.locale || this.currentLocale;
    const ns = options?.namespace;
    const fullKey = ns ? `${ns}.${key}` : key;

    // Check cache first
    const cacheKey = `${locale}:${fullKey}:${options?.count}`;
    if (this.config.enableCaching && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      return options?.values ? this.interpolate(cached, options.values) : cached;
    }

    // Lookup translation
    let translation = this.lookupTranslation(locale, fullKey);

    // Try fallback locale
    if (!translation && locale !== this.config.fallbackLocale) {
      translation = this.lookupTranslation(this.config.fallbackLocale, fullKey);
    }

    // Handle missing translation
    if (!translation) {
      this.recordMissing(locale, fullKey);
      translation = options?.defaultValue || this.config.missingHandler(fullKey, locale, ns);
    }

    // Handle pluralization
    if (options?.count !== undefined) {
      translation = this.pluralize(translation, options.count, locale, fullKey);
    }

    // Interpolate variables
    if (options?.values) {
      translation = this.interpolate(translation, options.values);
    }

    // Cache the result
    if (this.config.enableCaching) {
      this.cache.set(cacheKey, translation);
    }

    return translation;
  }

  /** Add translations for a locale */
  addTranslations(locale: SupportedLocale, translations: LocaleTranslations, namespace?: TranslationNamespace): void {
    const localeMap = this.translations.get(locale) || new Map<string, string>();

    for (const [key, value] of Object.entries(translations)) {
      const fullKey = namespace ? `${namespace}.${key}` : key;
      localeMap.set(fullKey, value);
    }

    this.translations.set(locale, localeMap);

    // Track loaded namespaces
    if (namespace) {
      const loaded = this.loadedNamespaces.get(locale) || new Set();
      loaded.add(namespace);
      this.loadedNamespaces.set(locale, loaded);
    }

    // Invalidate cache for this locale
    this.invalidateCache(locale);
  }

  /** Get current locale */
  getLocale(): SupportedLocale {
    return this.currentLocale;
  }

  /** Set current locale */
  setLocale(locale: SupportedLocale): void {
    if (!this.config.supportedLocales.includes(locale)) {
      throw new Error(`Unsupported locale: ${locale}. Supported: ${this.config.supportedLocales.join(', ')}`);
    }
    this.currentLocale = locale;
  }

  /** Check if a translation exists */
  hasTranslation(key: string, locale?: SupportedLocale, namespace?: TranslationNamespace): boolean {
    const targetLocale = locale || this.currentLocale;
    const fullKey = namespace ? `${namespace}.${key}` : key;
    const localeMap = this.translations.get(targetLocale);
    return localeMap?.has(fullKey) || false;
  }

  /** Get all missing translations for a locale */
  getMissing(locale?: SupportedLocale): string[] {
    const targetLocale = locale || this.currentLocale;
    const missing = this.missingKeys.get(targetLocale);
    return missing ? Array.from(missing) : [];
  }

  /** Interpolate variables into a translation string */
  interpolate(text: string, values: Record<string, string | number>): string {
    const { prefix, suffix, escapeValue } = this.config.interpolation;
    let result = text;

    for (const [key, value] of Object.entries(values)) {
      const placeholder = `${prefix}${key}${suffix}`;
      const replacement = escapeValue ? this.escapeHtml(String(value)) : String(value);
      result = result.split(placeholder).join(replacement);
    }

    return result;
  }

  /** Get translations for a specific namespace */
  getNamespace(locale: SupportedLocale, namespace: TranslationNamespace): Record<string, string> {
    const localeMap = this.translations.get(locale);
    if (!localeMap) return {};

    const prefix = `${namespace}.`;
    const result: Record<string, string> = {};

    for (const [key, value] of localeMap) {
      if (key.startsWith(prefix)) {
        result[key.substring(prefix.length)] = value;
      }
    }

    return result;
  }

  /** Load all translations for a locale (batch) */
  loadLocale(locale: SupportedLocale, data: Record<string, string>): void {
    const localeMap = this.translations.get(locale) || new Map<string, string>();
    for (const [key, value] of Object.entries(data)) {
      localeMap.set(key, value);
    }
    this.translations.set(locale, localeMap);
    this.invalidateCache(locale);
  }

  /** Get supported locales */
  getSupportedLocales(): SupportedLocale[] {
    return [...this.config.supportedLocales];
  }

  /** Get translation count for a locale */
  getTranslationCount(locale: SupportedLocale): number {
    const localeMap = this.translations.get(locale);
    return localeMap?.size || 0;
  }

  /** Clear translation cache */
  clearCache(): void {
    this.cache.clear();
  }

  /** Register custom plural rule for a locale */
  registerPluralRule(locale: SupportedLocale, rule: PluralRule): void {
    this.pluralRules.set(locale, rule);
  }

  // --- Private Methods ---

  private lookupTranslation(locale: SupportedLocale, key: string): string | undefined {
    const localeMap = this.translations.get(locale);
    if (!localeMap) return undefined;

    // Direct lookup
    if (localeMap.has(key)) return localeMap.get(key);

    // Nested key resolution (e.g., "errors.notFound" -> "errors" -> "notFound")
    const parts = key.split('.');
    for (let i = parts.length - 1; i > 0; i--) {
      const parentKey = parts.slice(0, i).join('.');
      const childKey = parts.slice(i).join('.');
      const parent = localeMap.get(parentKey);
      if (parent && typeof parent === 'string') {
        return parent;
      }
    }

    return undefined;
  }

  private pluralize(text: string, count: number, locale: SupportedLocale, key: string): string {
    const rule = this.pluralRules.get(locale);
    if (!rule) return text;

    const category = rule(count);
    const localeMap = this.translations.get(locale);
    if (!localeMap) return text;

    // Look for plural forms: key_zero, key_one, key_two, key_few, key_many, key_other
    const pluralKey = `${key}_${category}`;
    if (localeMap.has(pluralKey)) {
      return localeMap.get(pluralKey)!;
    }

    // Fallback to other
    const otherKey = `${key}_other`;
    if (localeMap.has(otherKey)) {
      return localeMap.get(otherKey)!;
    }

    return text;
  }

  private recordMissing(locale: SupportedLocale, key: string): void {
    const missing = this.missingKeys.get(locale) || new Set();
    missing.add(key);
    this.missingKeys.set(locale, missing);
  }

  private invalidateCache(locale: SupportedLocale): void {
    const keysToRemove: string[] = [];
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${locale}:`)) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      this.cache.delete(key);
    }
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private initializeDefaultPluralRules(): void {
    // English (Germanic) - one/other
    const germanicRule: PluralRule = (n) => n === 1 ? 'one' : 'other';
    this.pluralRules.set('en', germanicRule);
    this.pluralRules.set('de', germanicRule);
    this.pluralRules.set('nl', germanicRule);
    this.pluralRules.set('sv', germanicRule);
    this.pluralRules.set('it', germanicRule);
    this.pluralRules.set('pt', germanicRule);
    this.pluralRules.set('es', germanicRule);
    this.pluralRules.set('hi', germanicRule);
    this.pluralRules.set('bn', germanicRule);
    this.pluralRules.set('tr', germanicRule);

    // French - one for 0 and 1, other for rest
    this.pluralRules.set('fr', (n) => (n === 0 || n === 1) ? 'one' : 'other');

    // Arabic - zero/one/two/few/many/other
    this.pluralRules.set('ar', (n) => {
      if (n === 0) return 'zero';
      if (n === 1) return 'one';
      if (n === 2) return 'two';
      if (n % 100 >= 3 && n % 100 <= 10) return 'few';
      if (n % 100 >= 11 && n % 100 <= 99) return 'many';
      return 'other';
    });

    // Russian/Polish (Slavic) - one/few/many/other
    const slavicRule: PluralRule = (n) => {
      const mod10 = n % 10;
      const mod100 = n % 100;
      if (mod10 === 1 && mod100 !== 11) return 'one';
      if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return 'few';
      if (mod10 === 0 || (mod10 >= 5 && mod10 <= 9) || (mod100 >= 11 && mod100 <= 14)) return 'many';
      return 'other';
    };
    this.pluralRules.set('ru', slavicRule);
    this.pluralRules.set('pl', slavicRule);

    // East Asian (Chinese, Japanese, Korean) - no plural forms
    const eastAsianRule: PluralRule = () => 'other';
    this.pluralRules.set('zh', eastAsianRule);
    this.pluralRules.set('ja', eastAsianRule);
    this.pluralRules.set('ko', eastAsianRule);
    this.pluralRules.set('vi', eastAsianRule);
    this.pluralRules.set('th', eastAsianRule);
    this.pluralRules.set('id', eastAsianRule);
  }
}
