// ============================================================================
// Privacy-First Ads - Behavioral Opt-In Service Tests
// ============================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { BehavioralOptInService } from '../services/behavioral-opt-in.service';

describe('BehavioralOptInService', () => {
  let service: BehavioralOptInService;

  beforeEach(() => {
    service = new BehavioralOptInService();
  });

  describe('getConsent', () => {
    it('should return false by default for any user', () => {
      expect(service.getConsent('user_1')).toBe(false);
      expect(service.getConsent('user_2')).toBe(false);
      expect(service.getConsent('user_unknown')).toBe(false);
    });

    it('should reject empty userId', () => {
      expect(() => service.getConsent('')).toThrow();
    });
  });

  describe('setConsent', () => {
    it('should set consent to true (opt in)', () => {
      service.setConsent('user_1', true);
      expect(service.getConsent('user_1')).toBe(true);
    });

    it('should set consent to false (opt out)', () => {
      service.setConsent('user_1', true);
      service.setConsent('user_1', false);
      expect(service.getConsent('user_1')).toBe(false);
    });

    it('should track consent per user independently', () => {
      service.setConsent('user_1', true);
      service.setConsent('user_2', false);

      expect(service.getConsent('user_1')).toBe(true);
      expect(service.getConsent('user_2')).toBe(false);
    });

    it('should reject empty userId', () => {
      expect(() => service.setConsent('', true)).toThrow();
    });
  });

  describe('isOptedIn', () => {
    it('should return false by default', () => {
      expect(service.isOptedIn('new_user')).toBe(false);
    });

    it('should return true after opt-in', () => {
      service.setConsent('user_1', true);
      expect(service.isOptedIn('user_1')).toBe(true);
    });

    it('should return false after opt-out', () => {
      service.setConsent('user_1', true);
      service.setConsent('user_1', false);
      expect(service.isOptedIn('user_1')).toBe(false);
    });

    it('should reject empty userId', () => {
      expect(() => service.isOptedIn('')).toThrow();
    });
  });
});
