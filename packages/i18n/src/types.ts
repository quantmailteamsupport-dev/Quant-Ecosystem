// ============================================================================
// i18n Package - Type Definitions
// Types for internationalization, localization, and translation management
// ============================================================================

/** Supported locale identifiers (BCP 47) */
export type SupportedLocale =
  | 'en' | 'hi' | 'es' | 'fr' | 'ar' | 'zh' | 'ja' | 'ko'
  | 'de' | 'pt' | 'ru' | 'it' | 'tr' | 'vi' | 'th' | 'id'
  | 'nl' | 'pl' | 'sv' | 'bn';

/** Text direction */
export type Direction = 'ltr' | 'rtl';

/** Plural form categories (CLDR) */
export type PluralCategory = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';

/** Number format styles */
export type NumberFormatStyle = 'decimal' | 'currency' | 'percent' | 'unit' | 'compact';

/** Date format styles */
export type DateFormatStyle = 'short' | 'medium' | 'long' | 'full' | 'relative';

/** Currency codes (ISO 4217) */
export type CurrencyCode =
  | 'USD' | 'EUR' | 'GBP' | 'INR' | 'JPY' | 'CNY' | 'KRW'
  | 'BRL' | 'RUB' | 'AUD' | 'CAD' | 'CHF' | 'SEK' | 'PLN'
  | 'TRY' | 'THB' | 'IDR' | 'VND' | 'BDT' | 'SAR' | 'AED';

/** Unit types for formatting */
export type UnitType =
  | 'byte' | 'kilobyte' | 'megabyte' | 'gigabyte'
  | 'meter' | 'kilometer' | 'mile'
  | 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year'
  | 'celsius' | 'fahrenheit';

/** Translation namespace for organizing keys */
export type TranslationNamespace =
  | 'common' | 'auth' | 'navigation' | 'errors' | 'notifications'
  | 'settings' | 'profile' | 'chat' | 'media' | 'payments'
  | 'moderation' | 'search' | 'ads';

/** Locale metadata */
export interface LocaleInfo {
  code: SupportedLocale;
  name: string;
  nativeName: string;
  direction: Direction;
  script: string;
  region?: string;
  dateOrder: 'MDY' | 'DMY' | 'YMD';
  numberGroupSeparator: string;
  numberDecimalSeparator: string;
  currencyCode: CurrencyCode;
  currencySymbol: string;
  currencyPosition: 'prefix' | 'suffix';
}

/** Translation key with interpolation */
export interface TranslationEntry {
  key: string;
  value: string;
  namespace: TranslationNamespace;
  pluralForms?: Partial<Record<PluralCategory, string>>;
  context?: string;
  maxLength?: number;
}

/** Number format options */
export interface NumberFormatOptions {
  style: NumberFormatStyle;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  useGrouping?: boolean;
  currency?: CurrencyCode;
  unit?: UnitType;
  notation?: 'standard' | 'scientific' | 'engineering' | 'compact';
  compactDisplay?: 'short' | 'long';
  signDisplay?: 'auto' | 'always' | 'never' | 'exceptZero';
}

/** Date format options */
export interface DateFormatOptions {
  style?: DateFormatStyle;
  year?: 'numeric' | '2-digit';
  month?: 'numeric' | '2-digit' | 'long' | 'short' | 'narrow';
  day?: 'numeric' | '2-digit';
  hour?: 'numeric' | '2-digit';
  minute?: 'numeric' | '2-digit';
  second?: 'numeric' | '2-digit';
  weekday?: 'long' | 'short' | 'narrow';
  timeZone?: string;
  hour12?: boolean;
}

/** Interpolation options for translation strings */
export interface InterpolationOptions {
  prefix: string;
  suffix: string;
  escapeValue: boolean;
  defaultValue?: string;
  skipOnMissing: boolean;
}

/** Plural rule function signature */
export type PluralRule = (count: number) => PluralCategory;

/** Missing translation handler */
export type MissingTranslationHandler = (
  key: string,
  locale: SupportedLocale,
  namespace?: TranslationNamespace
) => string;

/** Translation manager configuration */
export interface TranslationManagerConfig {
  defaultLocale: SupportedLocale;
  fallbackLocale: SupportedLocale;
  supportedLocales: SupportedLocale[];
  interpolation: InterpolationOptions;
  missingHandler: MissingTranslationHandler;
  enableCaching: boolean;
  namespaces: TranslationNamespace[];
}

/** Locale detector configuration */
export interface LocaleDetectorConfig {
  order: ('browser' | 'header' | 'cookie' | 'url' | 'ip' | 'default')[];
  cookieName: string;
  urlParam: string;
  headerName: string;
  defaultLocale: SupportedLocale;
  supportedLocales: SupportedLocale[];
}

/** Formatter configuration */
export interface FormatterConfig {
  locale: SupportedLocale;
  defaultCurrency: CurrencyCode;
  defaultTimeZone: string;
  use24Hour: boolean;
}

/** RTL configuration */
export interface RTLConfig {
  rtlLocales: SupportedLocale[];
  enableAutoFlip: boolean;
  excludeProperties: string[];
}

/** Locale translation map */
export type LocaleTranslations = Record<string, string>;

/** Namespace translation map */
export type NamespaceTranslations = Partial<Record<TranslationNamespace, LocaleTranslations>>;

/** Complete locale data */
export interface LocaleData {
  locale: SupportedLocale;
  info: LocaleInfo;
  translations: LocaleTranslations;
  pluralRule: PluralRule;
}
