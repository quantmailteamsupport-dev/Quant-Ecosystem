// ============================================================================
// AI Core - Safety Pipeline
// ============================================================================

import type { SafetyResult, PiiEntity, SafetyCategory } from '../types';

/** PII pattern definitions */
const PII_PATTERNS: Array<{ type: PiiEntity['type']; regex: RegExp; replacement: string }> = [
  {
    type: 'email',
    regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    replacement: '[EMAIL_REDACTED]',
  },
  {
    type: 'ssn',
    regex: /\b\d{3}-\d{2}-\d{4}\b/g,
    replacement: '[SSN_REDACTED]',
  },
  {
    type: 'credit_card',
    regex: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
    replacement: '[CC_REDACTED]',
  },
  {
    type: 'ip_address',
    regex: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
    replacement: '[IP_REDACTED]',
  },
  {
    type: 'phone',
    regex: /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    replacement: '[PHONE_REDACTED]',
  },
];

/** Harmful content keywords by category */
const HARMFUL_KEYWORDS: Record<string, string[]> = {
  violence: ['kill', 'murder', 'attack', 'bomb', 'weapon', 'shoot', 'stab', 'assault'],
  hate_speech: ['hate', 'racist', 'bigot', 'slur', 'supremacy', 'genocide'],
  self_harm: ['suicide', 'self-harm', 'cut myself', 'end my life'],
  illegal: ['illegal drugs', 'hack into', 'steal identity', 'launder money'],
};

/** Threshold for flagging content */
const SAFETY_THRESHOLD = 0.6;

/**
 * Safety Pipeline
 *
 * Provides PII redaction and content moderation for AI inputs/outputs.
 * - Redacts emails, phone numbers, SSNs, credit cards, and IP addresses
 * - Scores content for harmful categories
 * - Returns safety assessment with detailed breakdown
 */
export class SafetyPipeline {
  /**
   * Process input text before sending to AI provider.
   * Redacts PII to prevent data leakage.
   */
  processInput(text: string): SafetyResult {
    const { redactedText, entities } = this.redactPii(text);
    const { score, categories } = this.checkContent(text);

    return {
      text: redactedText,
      redactedEntities: entities,
      safetyScore: score,
      isSafe: score < SAFETY_THRESHOLD,
      categories,
    };
  }

  /**
   * Process output text from AI provider.
   * Checks for safety issues in the response.
   */
  processOutput(text: string): SafetyResult {
    const { redactedText, entities } = this.redactPii(text);
    const { score, categories } = this.checkContent(text);

    return {
      text: redactedText,
      redactedEntities: entities,
      safetyScore: score,
      isSafe: score < SAFETY_THRESHOLD,
      categories,
    };
  }

  /**
   * Redact PII patterns from text
   */
  redactPii(text: string): { redactedText: string; entities: PiiEntity[] } {
    const entities: PiiEntity[] = [];
    let redactedText = text;

    for (const pattern of PII_PATTERNS) {
      const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
      let match: RegExpExecArray | null;

      while ((match = regex.exec(text)) !== null) {
        entities.push({
          type: pattern.type,
          value: this.maskValue(match[0], pattern.type),
          redacted: pattern.replacement,
          start: match.index,
          end: match.index + match[0].length,
        });
      }

      redactedText = redactedText.replace(
        new RegExp(pattern.regex.source, pattern.regex.flags),
        pattern.replacement,
      );
    }

    return { redactedText, entities };
  }

  /**
   * Partially mask a PII value to avoid storing raw sensitive data.
   * Shows just enough to identify the entity without exposing full data.
   */
  private maskValue(value: string, type: PiiEntity['type']): string {
    switch (type) {
      case 'email': {
        // Show first char and domain: t***@example.com
        const atIndex = value.indexOf('@');
        if (atIndex <= 0) return '***';
        const localPart = value.slice(0, atIndex);
        const domain = value.slice(atIndex);
        if (localPart.length <= 1) return localPart + '***' + domain;
        return localPart[0] + '***' + domain;
      }
      case 'ssn': {
        // Show last 4 digits: ***-**-6789
        const digits = value.replace(/\D/g, '');
        if (digits.length < 4) return '***-**-****';
        return '***-**-' + digits.slice(-4);
      }
      case 'credit_card': {
        // Show last 4 digits: ****-****-****-9012
        const ccDigits = value.replace(/\D/g, '');
        if (ccDigits.length < 4) return '****-****-****-****';
        return '****-****-****-' + ccDigits.slice(-4);
      }
      case 'phone': {
        // Show last 4 digits: ***-***-4567
        const phoneDigits = value.replace(/\D/g, '');
        if (phoneDigits.length < 4) return '***-***-****';
        return '***-***-' + phoneDigits.slice(-4);
      }
      case 'ip_address': {
        // Show last octet: ***.***.***.100
        const parts = value.split('.');
        if (parts.length < 4) return '***.***.***.***';
        return '***.***.***.' + parts[parts.length - 1];
      }
      default:
        return '***';
    }
  }

  /**
   * Check content for harmful patterns
   */
  checkContent(text: string): { score: number; categories: SafetyCategory[] } {
    const textLower = text.toLowerCase();
    const categories: SafetyCategory[] = [];
    let maxScore = 0;

    for (const [categoryName, keywords] of Object.entries(HARMFUL_KEYWORDS)) {
      let matchCount = 0;
      for (const keyword of keywords) {
        if (textLower.includes(keyword)) {
          matchCount++;
        }
      }

      const score = Math.min(matchCount / 3, 1.0);
      const flagged = score >= SAFETY_THRESHOLD;

      categories.push({
        name: categoryName,
        score,
        flagged,
      });

      if (score > maxScore) {
        maxScore = score;
      }
    }

    return { score: maxScore, categories };
  }
}
