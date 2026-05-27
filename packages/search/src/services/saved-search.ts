// ============================================================================
// Saved Search Service - CRUD for saved searches with alert scheduling
// ============================================================================

import { z } from 'zod';

export const AlertFrequencySchema = z.enum(['immediate', 'daily', 'weekly', 'never']);
export type AlertFrequency = z.infer<typeof AlertFrequencySchema>;

export const SavedSearchSchema = z.object({
  id: z.string(),
  userId: z.string(),
  query: z.string(),
  filters: z.record(z.string()).default({}),
  alertFrequency: AlertFrequencySchema.default('never'),
  createdAt: z.date(),
  lastAlertedAt: z.date().optional(),
});

export type SavedSearch = z.infer<typeof SavedSearchSchema>;

export interface CreateSavedSearchInput {
  userId: string;
  query: string;
  filters?: Record<string, string>;
  alertFrequency?: AlertFrequency;
}

export interface UpdateSavedSearchInput {
  query?: string;
  filters?: Record<string, string>;
  alertFrequency?: AlertFrequency;
}

export interface DocumentToMatch {
  id: string;
  content: string;
  type: string;
  metadata?: Record<string, string>;
}

export interface SavedSearchMatch {
  savedSearch: SavedSearch;
  documentId: string;
}

/**
 * SavedSearchService - Manages saved searches with alert scheduling
 *
 * Provides CRUD operations for saved searches, document matching for alert triggering,
 * and scheduled alert retrieval.
 */
export class SavedSearchService {
  private readonly store = new Map<string, SavedSearch>();
  private idCounter = 0;

  create(input: CreateSavedSearchInput): SavedSearch {
    this.idCounter++;
    const saved: SavedSearch = {
      id: `ss-${this.idCounter}`,
      userId: input.userId,
      query: input.query,
      filters: input.filters ?? {},
      alertFrequency: input.alertFrequency ?? 'never',
      createdAt: new Date(),
      lastAlertedAt: undefined,
    };
    this.store.set(saved.id, saved);
    return saved;
  }

  get(id: string): SavedSearch | undefined {
    return this.store.get(id);
  }

  listByUser(userId: string): SavedSearch[] {
    const results: SavedSearch[] = [];
    for (const saved of this.store.values()) {
      if (saved.userId === userId) {
        results.push(saved);
      }
    }
    return results;
  }

  update(id: string, input: UpdateSavedSearchInput): SavedSearch | undefined {
    const existing = this.store.get(id);
    if (!existing) return undefined;

    const updated: SavedSearch = {
      ...existing,
      query: input.query ?? existing.query,
      filters: input.filters ?? existing.filters,
      alertFrequency: input.alertFrequency ?? existing.alertFrequency,
    };
    this.store.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    return this.store.delete(id);
  }

  /**
   * Check if a new document matches any saved searches.
   * Returns matches for saved searches that have alerting enabled.
   */
  matchNewDocument(document: DocumentToMatch): SavedSearchMatch[] {
    const matches: SavedSearchMatch[] = [];
    const contentLower = document.content.toLowerCase();

    for (const saved of this.store.values()) {
      if (saved.alertFrequency === 'never') continue;

      const queryTerms = saved.query.toLowerCase().split(/\s+/).filter(Boolean);
      const allTermsMatch = queryTerms.every((term) => contentLower.includes(term));

      if (!allTermsMatch) continue;

      // Check filters match document metadata
      let filtersMatch = true;
      for (const [key, value] of Object.entries(saved.filters)) {
        if (key === 'type' && document.type !== value) {
          filtersMatch = false;
          break;
        }
        if (document.metadata && key !== 'type') {
          const metaValue = document.metadata[key];
          if (metaValue !== undefined && metaValue !== value) {
            filtersMatch = false;
            break;
          }
        }
      }

      if (filtersMatch) {
        matches.push({ savedSearch: saved, documentId: document.id });
      }
    }

    return matches;
  }

  /**
   * Get saved searches that are due for alert checking based on their frequency.
   */
  getAlertsDue(): SavedSearch[] {
    const now = new Date();
    const due: SavedSearch[] = [];

    for (const saved of this.store.values()) {
      if (saved.alertFrequency === 'never') continue;
      if (saved.alertFrequency === 'immediate') {
        due.push(saved);
        continue;
      }

      if (!saved.lastAlertedAt) {
        due.push(saved);
        continue;
      }

      const elapsed = now.getTime() - saved.lastAlertedAt.getTime();
      const dayMs = 24 * 60 * 60 * 1000;

      if (saved.alertFrequency === 'daily' && elapsed >= dayMs) {
        due.push(saved);
      } else if (saved.alertFrequency === 'weekly' && elapsed >= 7 * dayMs) {
        due.push(saved);
      }
    }

    return due;
  }

  /**
   * Mark a saved search as having been alerted at the current time.
   */
  markAlerted(id: string): void {
    const existing = this.store.get(id);
    if (existing) {
      this.store.set(id, { ...existing, lastAlertedAt: new Date() });
    }
  }
}
