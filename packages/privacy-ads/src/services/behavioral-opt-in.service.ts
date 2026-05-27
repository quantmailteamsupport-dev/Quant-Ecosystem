// ============================================================================
// Privacy-First Ads - Behavioral Opt-In Service
// Manages user consent for behavioral targeting. Default is false (opt-in only).
// ============================================================================

import { z } from 'zod';

export const SetConsentSchema = z.object({
  userId: z.string().min(1),
  consented: z.boolean(),
});

export const GetConsentSchema = z.object({
  userId: z.string().min(1),
});

/**
 * BehavioralOptInService - Manages user consent state
 *
 * Behavioral targeting is strictly opt-in. Default consent state is false.
 * Users must explicitly opt in before the on-device ranker can use
 * behavioral signals for ad targeting.
 */
export class BehavioralOptInService {
  private readonly consentStore = new Map<string, boolean>();

  /**
   * Get consent state for a user. Default is false (not opted in).
   */
  getConsent(userId: string): boolean {
    GetConsentSchema.parse({ userId });
    return this.consentStore.get(userId) ?? false;
  }

  /**
   * Set consent state for a user.
   */
  setConsent(userId: string, consented: boolean): void {
    SetConsentSchema.parse({ userId, consented });
    this.consentStore.set(userId, consented);
  }

  /**
   * Check if a user has opted in to behavioral targeting.
   */
  isOptedIn(userId: string): boolean {
    GetConsentSchema.parse({ userId });
    return this.consentStore.get(userId) ?? false;
  }
}
