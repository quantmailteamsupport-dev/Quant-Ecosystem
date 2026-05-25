// ============================================================================
// i18n - Formatter
// Locale-aware number, currency, date, and unit formatting
// ============================================================================

import type {
  SupportedLocale,
  CurrencyCode,
  FormatterConfig,
  NumberFormatOptions,
  DateFormatOptions,
  UnitType,
} from '../types';

const DEFAULT_CONFIG: FormatterConfig = {
  locale: 'en',
  defaultCurrency: 'USD',
  defaultTimeZone: 'UTC',
  use24Hour: false,
};

interface LocaleFormattingRules {
  groupSeparator: string;
  decimalSeparator: string;
  currencySymbol: string;
  currencyPosition: 'prefix' | 'suffix';
  dateOrder: 'MDY' | 'DMY' | 'YMD';
  timeSeparator: string;
  listSeparator: string;
}

/** Locale-specific formatting rules */
const LOCALE_RULES: Record<SupportedLocale, LocaleFormattingRules> = {
  en: { groupSeparator: ',', decimalSeparator: '.', currencySymbol: '$', currencyPosition: 'prefix', dateOrder: 'MDY', timeSeparator: ':', listSeparator: ', ' },
  hi: { groupSeparator: ',', decimalSeparator: '.', currencySymbol: '\u20b9', currencyPosition: 'prefix', dateOrder: 'DMY', timeSeparator: ':', listSeparator: ', ' },
  es: { groupSeparator: '.', decimalSeparator: ',', currencySymbol: '\u20ac', currencyPosition: 'suffix', dateOrder: 'DMY', timeSeparator: ':', listSeparator: ', ' },
  fr: { groupSeparator: ' ', decimalSeparator: ',', currencySymbol: '\u20ac', currencyPosition: 'suffix', dateOrder: 'DMY', timeSeparator: ':', listSeparator: ', ' },
  ar: { groupSeparator: '.', decimalSeparator: ',', currencySymbol: '\u0631.\u0633', currencyPosition: 'suffix', dateOrder: 'DMY', timeSeparator: ':', listSeparator: '\u060c ' },
  zh: { groupSeparator: ',', decimalSeparator: '.', currencySymbol: '\u00a5', currencyPosition: 'prefix', dateOrder: 'YMD', timeSeparator: ':', listSeparator: '\u3001' },
  ja: { groupSeparator: ',', decimalSeparator: '.', currencySymbol: '\u00a5', currencyPosition: 'prefix', dateOrder: 'YMD', timeSeparator: ':', listSeparator: '\u3001' },
  ko: { groupSeparator: ',', decimalSeparator: '.', currencySymbol: '\u20a9', currencyPosition: 'prefix', dateOrder: 'YMD', timeSeparator: ':', listSeparator: ', ' },
  de: { groupSeparator: '.', decimalSeparator: ',', currencySymbol: '\u20ac', currencyPosition: 'suffix', dateOrder: 'DMY', timeSeparator: ':', listSeparator: ', ' },
  pt: { groupSeparator: '.', decimalSeparator: ',', currencySymbol: 'R$', currencyPosition: 'prefix', dateOrder: 'DMY', timeSeparator: ':', listSeparator: ', ' },
  ru: { groupSeparator: ' ', decimalSeparator: ',', currencySymbol: '\u20bd', currencyPosition: 'suffix', dateOrder: 'DMY', timeSeparator: ':', listSeparator: ', ' },
  it: { groupSeparator: '.', decimalSeparator: ',', currencySymbol: '\u20ac', currencyPosition: 'suffix', dateOrder: 'DMY', timeSeparator: ':', listSeparator: ', ' },
  tr: { groupSeparator: '.', decimalSeparator: ',', currencySymbol: '\u20ba', currencyPosition: 'suffix', dateOrder: 'DMY', timeSeparator: ':', listSeparator: ', ' },
  vi: { groupSeparator: '.', decimalSeparator: ',', currencySymbol: '\u20ab', currencyPosition: 'suffix', dateOrder: 'DMY', timeSeparator: ':', listSeparator: ', ' },
  th: { groupSeparator: ',', decimalSeparator: '.', currencySymbol: '\u0e3f', currencyPosition: 'prefix', dateOrder: 'DMY', timeSeparator: ':', listSeparator: ', ' },
  id: { groupSeparator: '.', decimalSeparator: ',', currencySymbol: 'Rp', currencyPosition: 'prefix', dateOrder: 'DMY', timeSeparator: '.', listSeparator: ', ' },
  nl: { groupSeparator: '.', decimalSeparator: ',', currencySymbol: '\u20ac', currencyPosition: 'prefix', dateOrder: 'DMY', timeSeparator: ':', listSeparator: ', ' },
  pl: { groupSeparator: ' ', decimalSeparator: ',', currencySymbol: 'z\u0142', currencyPosition: 'suffix', dateOrder: 'DMY', timeSeparator: ':', listSeparator: ', ' },
  sv: { groupSeparator: ' ', decimalSeparator: ',', currencySymbol: 'kr', currencyPosition: 'suffix', dateOrder: 'YMD', timeSeparator: ':', listSeparator: ', ' },
  bn: { groupSeparator: ',', decimalSeparator: '.', currencySymbol: '\u09f3', currencyPosition: 'prefix', dateOrder: 'DMY', timeSeparator: ':', listSeparator: ', ' },
};

/**
 * Formatter - Locale-aware data formatting engine
 *
 * Formats numbers, currencies, dates, relative times, lists, units,
 * and percentages with proper locale-specific separators, symbols,
 * and ordering conventions.
 */
export class Formatter {
  private config: FormatterConfig;
  private rules: LocaleFormattingRules;

  constructor(config: Partial<FormatterConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.rules = LOCALE_RULES[this.config.locale] || LOCALE_RULES.en;
  }

  /** Set locale and update formatting rules */
  setLocale(locale: SupportedLocale): void {
    this.config.locale = locale;
    this.rules = LOCALE_RULES[locale] || LOCALE_RULES.en;
  }

  /** Format a number with locale-specific grouping */
  formatNumber(value: number, options?: Partial<NumberFormatOptions>): string {
    const minFrac = options?.minimumFractionDigits ?? 0;
    const maxFrac = options?.maximumFractionDigits ?? 2;
    const useGrouping = options?.useGrouping !== false;

    if (options?.notation === 'compact') {
      return this.formatCompact(value, options.compactDisplay || 'short');
    }

    const isNegative = value < 0;
    const absValue = Math.abs(value);
    const fixed = absValue.toFixed(maxFrac);
    const [integerPart, decimalPart] = fixed.split('.');

    let formattedInteger = integerPart;
    if (useGrouping) {
      formattedInteger = this.addGroupSeparators(integerPart);
    }

    let result = formattedInteger;
    if (maxFrac > 0) {
      const trimmedDecimal = this.trimDecimal(decimalPart || '', minFrac, maxFrac);
      if (trimmedDecimal) {
        result += this.rules.decimalSeparator + trimmedDecimal;
      }
    }

    if (isNegative) result = '-' + result;
    if (options?.signDisplay === 'always' && !isNegative) result = '+' + result;

    return result;
  }

  /** Format currency amount */
  formatCurrency(amount: number, currency?: CurrencyCode): string {
    const currencyCode = currency || this.config.defaultCurrency;
    const symbols: Partial<Record<CurrencyCode, string>> = {
      USD: '$', EUR: '\u20ac', GBP: '\u00a3', INR: '\u20b9', JPY: '\u00a5',
      CNY: '\u00a5', KRW: '\u20a9', BRL: 'R$', RUB: '\u20bd', AUD: 'A$',
      CAD: 'C$', CHF: 'CHF', SEK: 'kr', PLN: 'z\u0142', TRY: '\u20ba',
      THB: '\u0e3f', IDR: 'Rp', VND: '\u20ab', BDT: '\u09f3', SAR: '\u0631.\u0633', AED: '\u062f.\u0625',
    };

    const symbol = symbols[currencyCode] || currencyCode;
    const decimals = ['JPY', 'KRW', 'VND', 'IDR'].includes(currencyCode) ? 0 : 2;
    const formattedAmount = this.formatNumber(Math.abs(amount), { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

    const isNegative = amount < 0;
    let result: string;

    if (this.rules.currencyPosition === 'prefix') {
      result = `${symbol}${formattedAmount}`;
    } else {
      result = `${formattedAmount} ${symbol}`;
    }

    return isNegative ? `-${result}` : result;
  }

  /** Format a date */
  formatDate(date: Date | number, options?: Partial<DateFormatOptions>): string {
    const d = typeof date === 'number' ? new Date(date) : date;
    const style = options?.style || 'medium';

    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const hours = d.getHours();
    const minutes = d.getMinutes();

    const padded = (n: number) => n.toString().padStart(2, '0');

    switch (style) {
      case 'short':
        return this.formatDateByOrder(padded(month), padded(day), year.toString().slice(-2));
      case 'medium':
        return this.formatDateByOrder(padded(month), padded(day), year.toString());
      case 'long': {
        const monthNames = this.getMonthNames();
        return `${monthNames[month - 1]} ${day}, ${year}`;
      }
      case 'full': {
        const monthNames = this.getMonthNames();
        const dayNames = this.getDayNames();
        const dayOfWeek = dayNames[d.getDay()];
        return `${dayOfWeek}, ${monthNames[month - 1]} ${day}, ${year}`;
      }
      case 'relative':
        return this.formatRelativeTime(d.getTime() - Date.now());
      default:
        return this.formatDateByOrder(padded(month), padded(day), year.toString());
    }
  }

  /** Format relative time (e.g., "2 hours ago", "in 3 days") */
  formatRelativeTime(diffMs: number): string {
    const absDiff = Math.abs(diffMs);
    const isPast = diffMs < 0;

    const seconds = Math.floor(absDiff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    let value: number;
    let unit: string;

    if (seconds < 60) { value = seconds; unit = 'second'; }
    else if (minutes < 60) { value = minutes; unit = 'minute'; }
    else if (hours < 24) { value = hours; unit = 'hour'; }
    else if (days < 7) { value = days; unit = 'day'; }
    else if (weeks < 4) { value = weeks; unit = 'week'; }
    else if (months < 12) { value = months; unit = 'month'; }
    else { value = years; unit = 'year'; }

    const plural = value !== 1 ? 's' : '';
    if (isPast) {
      return value === 0 ? 'just now' : `${value} ${unit}${plural} ago`;
    }
    return `in ${value} ${unit}${plural}`;
  }

  /** Format a list with proper conjunction */
  formatList(items: string[], style: 'conjunction' | 'disjunction' = 'conjunction'): string {
    if (items.length === 0) return '';
    if (items.length === 1) return items[0];
    if (items.length === 2) {
      const conjunction = style === 'conjunction' ? ' and ' : ' or ';
      return items[0] + conjunction + items[1];
    }
    const separator = this.rules.listSeparator;
    const last = items[items.length - 1];
    const rest = items.slice(0, -1).join(separator);
    const conjunction = style === 'conjunction' ? ' and ' : ' or ';
    return rest + separator + conjunction + last;
  }

  /** Format a value with unit */
  formatUnit(value: number, unit: UnitType): string {
    const unitLabels: Record<UnitType, { singular: string; plural: string }> = {
      byte: { singular: 'byte', plural: 'bytes' },
      kilobyte: { singular: 'KB', plural: 'KB' },
      megabyte: { singular: 'MB', plural: 'MB' },
      gigabyte: { singular: 'GB', plural: 'GB' },
      meter: { singular: 'meter', plural: 'meters' },
      kilometer: { singular: 'km', plural: 'km' },
      mile: { singular: 'mile', plural: 'miles' },
      second: { singular: 'sec', plural: 'secs' },
      minute: { singular: 'min', plural: 'mins' },
      hour: { singular: 'hr', plural: 'hrs' },
      day: { singular: 'day', plural: 'days' },
      week: { singular: 'week', plural: 'weeks' },
      month: { singular: 'month', plural: 'months' },
      year: { singular: 'year', plural: 'years' },
      celsius: { singular: '\u00b0C', plural: '\u00b0C' },
      fahrenheit: { singular: '\u00b0F', plural: '\u00b0F' },
    };

    const label = unitLabels[unit];
    const formattedValue = this.formatNumber(value);
    const unitLabel = value === 1 ? label.singular : label.plural;
    return `${formattedValue} ${unitLabel}`;
  }

  /** Format percentage */
  formatPercentage(value: number, decimals: number = 1): string {
    const formatted = this.formatNumber(value * 100, { maximumFractionDigits: decimals, minimumFractionDigits: decimals });
    return `${formatted}%`;
  }

  /** Format number in compact notation (1K, 1M, 1B) */
  formatCompact(value: number, display: 'short' | 'long' = 'short'): string {
    const abs = Math.abs(value);
    const sign = value < 0 ? '-' : '';

    if (display === 'short') {
      if (abs >= 1e12) return sign + (abs / 1e12).toFixed(1) + 'T';
      if (abs >= 1e9) return sign + (abs / 1e9).toFixed(1) + 'B';
      if (abs >= 1e6) return sign + (abs / 1e6).toFixed(1) + 'M';
      if (abs >= 1e3) return sign + (abs / 1e3).toFixed(1) + 'K';
      return sign + abs.toString();
    }

    if (abs >= 1e12) return sign + (abs / 1e12).toFixed(1) + ' trillion';
    if (abs >= 1e9) return sign + (abs / 1e9).toFixed(1) + ' billion';
    if (abs >= 1e6) return sign + (abs / 1e6).toFixed(1) + ' million';
    if (abs >= 1e3) return sign + (abs / 1e3).toFixed(1) + ' thousand';
    return sign + abs.toString();
  }

  // --- Private Methods ---

  private addGroupSeparators(integerStr: string): string {
    const parts: string[] = [];
    let remaining = integerStr;
    while (remaining.length > 3) {
      parts.unshift(remaining.slice(-3));
      remaining = remaining.slice(0, -3);
    }
    parts.unshift(remaining);
    return parts.join(this.rules.groupSeparator);
  }

  private trimDecimal(decimal: string, min: number, max: number): string {
    let trimmed = decimal.slice(0, max);
    while (trimmed.length > min && trimmed.endsWith('0')) {
      trimmed = trimmed.slice(0, -1);
    }
    return trimmed;
  }

  private formatDateByOrder(month: string, day: string, year: string): string {
    switch (this.rules.dateOrder) {
      case 'MDY': return `${month}/${day}/${year}`;
      case 'DMY': return `${day}/${month}/${year}`;
      case 'YMD': return `${year}/${month}/${day}`;
      default: return `${month}/${day}/${year}`;
    }
  }

  private getMonthNames(): string[] {
    return ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
  }

  private getDayNames(): string[] {
    return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  }
}
