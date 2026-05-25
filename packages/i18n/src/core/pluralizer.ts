// ============================================================================
// i18n - Pluralizer
// CLDR plural rules for 6+ language families
// ============================================================================

import type {
  SupportedLocale,
  PluralCategory,
  PluralRule,
} from '../types';

interface PluralRuleSet {
  locale: SupportedLocale;
  family: string;
  categories: PluralCategory[];
  rule: PluralRule;
  examples: Partial<Record<PluralCategory, number[]>>;
}

/**
 * Pluralizer - CLDR-based pluralization engine
 *
 * Implements plural rules for Germanic, Romance, Slavic, Arabic,
 * East Asian, and other language families following Unicode CLDR
 * specifications for correct plural form selection.
 */
export class Pluralizer {
  private rules: Map<SupportedLocale, PluralRuleSet>;
  private customRules: Map<SupportedLocale, PluralRule>;

  constructor() {
    this.rules = new Map();
    this.customRules = new Map();
    this.initializeRules();
  }

  /** Get the correct plural form for a count in a locale */
  pluralize(count: number, locale: SupportedLocale): PluralCategory {
    // Check custom rules first
    const customRule = this.customRules.get(locale);
    if (customRule) return customRule(count);

    const ruleSet = this.rules.get(locale);
    if (!ruleSet) return count === 1 ? 'one' : 'other';
    return ruleSet.rule(count);
  }

  /** Get the plural rule function for a locale */
  getRule(locale: SupportedLocale): PluralRule | null {
    const custom = this.customRules.get(locale);
    if (custom) return custom;

    const ruleSet = this.rules.get(locale);
    return ruleSet?.rule || null;
  }

  /** Add or override a plural rule for a locale */
  addRule(locale: SupportedLocale, rule: PluralRule): void {
    this.customRules.set(locale, rule);
  }

  /** Get available plural categories for a locale */
  getCategories(locale: SupportedLocale): PluralCategory[] {
    const ruleSet = this.rules.get(locale);
    if (!ruleSet) return ['one', 'other'];
    return ruleSet.categories;
  }

  /** Get the language family for a locale */
  getFamily(locale: SupportedLocale): string {
    const ruleSet = this.rules.get(locale);
    return ruleSet?.family || 'unknown';
  }

  /** Get example numbers for each plural category */
  getExamples(locale: SupportedLocale): Partial<Record<PluralCategory, number[]>> {
    const ruleSet = this.rules.get(locale);
    return ruleSet?.examples || {};
  }

  /** Test a value against all categories for a locale */
  testValue(count: number, locale: SupportedLocale): { category: PluralCategory; allCategories: PluralCategory[] } {
    const category = this.pluralize(count, locale);
    const categories = this.getCategories(locale);
    return { category, allCategories: categories };
  }

  /** Get all supported locales with their plural info */
  getAllRules(): { locale: SupportedLocale; family: string; categories: PluralCategory[] }[] {
    const result: { locale: SupportedLocale; family: string; categories: PluralCategory[] }[] = [];
    for (const [locale, ruleSet] of this.rules) {
      result.push({ locale, family: ruleSet.family, categories: ruleSet.categories });
    }
    return result;
  }

  // --- Private: Rule Initialization ---

  private initializeRules(): void {
    // Germanic family (English, German, Dutch, Swedish)
    // Rule: one for n=1, other for everything else
    const germanicRule: PluralRule = (n) => n === 1 ? 'one' : 'other';
    const germanicCategories: PluralCategory[] = ['one', 'other'];
    const germanicExamples = { one: [1], other: [0, 2, 3, 4, 5, 10, 100] };

    this.rules.set('en', { locale: 'en', family: 'Germanic', categories: germanicCategories, rule: germanicRule, examples: germanicExamples });
    this.rules.set('de', { locale: 'de', family: 'Germanic', categories: germanicCategories, rule: germanicRule, examples: germanicExamples });
    this.rules.set('nl', { locale: 'nl', family: 'Germanic', categories: germanicCategories, rule: germanicRule, examples: germanicExamples });
    this.rules.set('sv', { locale: 'sv', family: 'Germanic', categories: germanicCategories, rule: germanicRule, examples: germanicExamples });

    // Romance family (Spanish, French, Italian, Portuguese)
    // French: one for n=0,1; other for rest
    this.rules.set('fr', {
      locale: 'fr', family: 'Romance', categories: ['one', 'other'],
      rule: (n) => (n === 0 || n === 1) ? 'one' : 'other',
      examples: { one: [0, 1], other: [2, 3, 5, 10, 100] },
    });
    // Spanish, Italian, Portuguese: same as Germanic
    this.rules.set('es', { locale: 'es', family: 'Romance', categories: germanicCategories, rule: germanicRule, examples: germanicExamples });
    this.rules.set('it', { locale: 'it', family: 'Romance', categories: germanicCategories, rule: germanicRule, examples: germanicExamples });
    this.rules.set('pt', { locale: 'pt', family: 'Romance', categories: germanicCategories, rule: germanicRule, examples: germanicExamples });

    // Slavic family (Russian, Polish)
    // Complex: one/few/many/other based on mod10 and mod100
    const russianRule: PluralRule = (n) => {
      const mod10 = n % 10;
      const mod100 = n % 100;
      if (mod10 === 1 && mod100 !== 11) return 'one';
      if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return 'few';
      if (mod10 === 0 || (mod10 >= 5 && mod10 <= 9) || (mod100 >= 11 && mod100 <= 14)) return 'many';
      return 'other';
    };
    this.rules.set('ru', {
      locale: 'ru', family: 'Slavic', categories: ['one', 'few', 'many', 'other'],
      rule: russianRule,
      examples: { one: [1, 21, 31, 101], few: [2, 3, 4, 22, 23], many: [0, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 25] },
    });

    // Polish: slightly different from Russian
    const polishRule: PluralRule = (n) => {
      if (n === 1) return 'one';
      const mod10 = n % 10;
      const mod100 = n % 100;
      if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return 'few';
      if (mod10 === 0 || mod10 === 1 || (mod10 >= 5 && mod10 <= 9) || (mod100 >= 12 && mod100 <= 14)) return 'many';
      return 'other';
    };
    this.rules.set('pl', {
      locale: 'pl', family: 'Slavic', categories: ['one', 'few', 'many', 'other'],
      rule: polishRule,
      examples: { one: [1], few: [2, 3, 4, 22, 23, 24], many: [0, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 25] },
    });

    // Arabic - most complex: zero/one/two/few/many/other
    const arabicRule: PluralRule = (n) => {
      if (n === 0) return 'zero';
      if (n === 1) return 'one';
      if (n === 2) return 'two';
      const mod100 = n % 100;
      if (mod100 >= 3 && mod100 <= 10) return 'few';
      if (mod100 >= 11 && mod100 <= 99) return 'many';
      return 'other';
    };
    this.rules.set('ar', {
      locale: 'ar', family: 'Arabic', categories: ['zero', 'one', 'two', 'few', 'many', 'other'],
      rule: arabicRule,
      examples: { zero: [0], one: [1], two: [2], few: [3, 4, 5, 6, 7, 8, 9, 10], many: [11, 12, 99], other: [100, 200] },
    });

    // East Asian family (Chinese, Japanese, Korean, Vietnamese, Thai, Indonesian)
    // No plural distinctions
    const eastAsianRule: PluralRule = () => 'other';
    const eastAsianCategories: PluralCategory[] = ['other'];
    const eastAsianExamples = { other: [0, 1, 2, 3, 5, 10, 100] };

    this.rules.set('zh', { locale: 'zh', family: 'East Asian', categories: eastAsianCategories, rule: eastAsianRule, examples: eastAsianExamples });
    this.rules.set('ja', { locale: 'ja', family: 'East Asian', categories: eastAsianCategories, rule: eastAsianRule, examples: eastAsianExamples });
    this.rules.set('ko', { locale: 'ko', family: 'East Asian', categories: eastAsianCategories, rule: eastAsianRule, examples: eastAsianExamples });
    this.rules.set('vi', { locale: 'vi', family: 'East Asian', categories: eastAsianCategories, rule: eastAsianRule, examples: eastAsianExamples });
    this.rules.set('th', { locale: 'th', family: 'East Asian', categories: eastAsianCategories, rule: eastAsianRule, examples: eastAsianExamples });
    this.rules.set('id', { locale: 'id', family: 'Austronesian', categories: eastAsianCategories, rule: eastAsianRule, examples: eastAsianExamples });

    // Turkish - one/other (but one only for exactly 1)
    this.rules.set('tr', {
      locale: 'tr', family: 'Turkic', categories: ['one', 'other'],
      rule: (n) => n === 1 ? 'one' : 'other',
      examples: { one: [1], other: [0, 2, 3, 100] },
    });

    // Indic family (Hindi, Bengali)
    // one for n=0,1; other for rest (same as French for count)
    const indicRule: PluralRule = (n) => (n === 0 || n === 1) ? 'one' : 'other';
    this.rules.set('hi', {
      locale: 'hi', family: 'Indic', categories: ['one', 'other'],
      rule: indicRule,
      examples: { one: [0, 1], other: [2, 3, 4, 5, 100] },
    });
    this.rules.set('bn', {
      locale: 'bn', family: 'Indic', categories: ['one', 'other'],
      rule: indicRule,
      examples: { one: [0, 1], other: [2, 3, 4, 5, 100] },
    });
  }
}
