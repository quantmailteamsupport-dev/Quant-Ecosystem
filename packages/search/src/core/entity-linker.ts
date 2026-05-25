// ============================================================================
// Search Package - Entity Linker
// ============================================================================

import type { EntityCandidate, EntityLink, LinkConfidence, GazetteerEntry } from '../types';

interface RecognizedMention {
  text: string;
  startOffset: number;
  endOffset: number;
  type: string;
  confidence: number;
}

interface CoreferenceChain {
  referentId: string;
  referentName: string;
  mentions: Array<{ text: string; startOffset: number; endOffset: number }>;
}

/** Entity linking engine with NER, disambiguation, and coreference resolution */
export class EntityLinker {
  private gazetteer: Map<string, GazetteerEntry>;
  private aliasIndex: Map<string, string[]>; // lowercase alias -> entity IDs
  private entityPopularity: Map<string, number>;
  private patternMatchers: Array<{ pattern: RegExp; type: string; confidence: number }>;
  private contextWindowSize: number;

  constructor(contextWindowSize: number = 50) {
    this.gazetteer = new Map();
    this.aliasIndex = new Map();
    this.entityPopularity = new Map();
    this.contextWindowSize = contextWindowSize;
    this.patternMatchers = this.initializePatterns();
  }

  /** Initialize named entity recognition patterns */
  private initializePatterns(): Array<{ pattern: RegExp; type: string; confidence: number }> {
    return [
      // Person names (capitalized sequences)
      { pattern: /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g, type: 'PERSON', confidence: 0.6 },
      // Organization indicators
      {
        pattern:
          /\b([A-Z][a-z]*(?:\s+[A-Z][a-z]*)*\s+(?:Inc|Corp|LLC|Ltd|Co|Foundation|University|Institute)\.?)\b/g,
        type: 'ORGANIZATION',
        confidence: 0.85,
      },
      // Location patterns
      {
        pattern: /\b(?:in|at|from|near)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g,
        type: 'LOCATION',
        confidence: 0.5,
      },
      // Date patterns
      { pattern: /\b(\d{1,2}\/\d{1,2}\/\d{2,4})\b/g, type: 'DATE', confidence: 0.9 },
      {
        pattern:
          /\b((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4})\b/g,
        type: 'DATE',
        confidence: 0.95,
      },
      // Email patterns
      {
        pattern: /\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/g,
        type: 'EMAIL',
        confidence: 0.99,
      },
      // URL patterns
      { pattern: /\b(https?:\/\/[^\s]+)\b/g, type: 'URL', confidence: 0.99 },
      // Money patterns
      { pattern: /(\$[\d,]+(?:\.\d{2})?)\b/g, type: 'MONEY', confidence: 0.95 },
      {
        pattern: /\b([\d,]+(?:\.\d{2})?\s*(?:dollars|USD|EUR|GBP))\b/g,
        type: 'MONEY',
        confidence: 0.9,
      },
    ];
  }

  /** Add an entry to the gazetteer */
  addGazetteerEntry(entry: GazetteerEntry): void {
    this.gazetteer.set(entry.entityId, entry);

    // Index canonical name and all aliases
    const allNames = [entry.canonicalName, ...entry.aliases];
    for (const name of allNames) {
      const lowerName = name.toLowerCase();
      if (!this.aliasIndex.has(lowerName)) {
        this.aliasIndex.set(lowerName, []);
      }
      const ids = this.aliasIndex.get(lowerName)!;
      if (!ids.includes(entry.entityId)) {
        ids.push(entry.entityId);
      }
    }
  }

  /** Set popularity score for an entity (for disambiguation) */
  setEntityPopularity(entityId: string, popularity: number): void {
    this.entityPopularity.set(entityId, popularity);
  }

  /**
   * Named entity recognition using pattern matching + gazetteer
   * Identifies entity mentions in text
   */
  recognizeEntities(text: string): RecognizedMention[] {
    const mentions: RecognizedMention[] = [];
    const usedRanges: Array<[number, number]> = [];

    // Pattern-based recognition
    for (const { pattern, type, confidence } of this.patternMatchers) {
      const regex = new RegExp(pattern.source, pattern.flags);
      let match: RegExpExecArray | null;

      while ((match = regex.exec(text)) !== null) {
        const matchText = match[1] || match[0];
        const startOffset = match.index + match[0].indexOf(matchText);
        const endOffset = startOffset + matchText.length;

        // Check for overlap with existing mentions
        const overlaps = usedRanges.some(([start, end]) => startOffset < end && endOffset > start);

        if (!overlaps) {
          mentions.push({ text: matchText, startOffset, endOffset, type, confidence });
          usedRanges.push([startOffset, endOffset]);
        }
      }
    }

    // Gazetteer-based recognition
    for (const [lowerAlias, entityIds] of this.aliasIndex) {
      if (lowerAlias.length < 3) continue; // Skip very short names

      const lowerText = text.toLowerCase();
      let searchStart = 0;

      while (true) {
        const index = lowerText.indexOf(lowerAlias, searchStart);
        if (index === -1) break;

        const endIndex = index + lowerAlias.length;

        // Verify word boundaries
        const prevChar = index > 0 ? (text[index - 1] ?? ' ') : ' ';
        const nextChar = endIndex < text.length ? (text[endIndex] ?? ' ') : ' ';
        const isWordBound =
          /[\s,.!?;:()\[\]{}]/.test(prevChar) && /[\s,.!?;:()\[\]{}]/.test(nextChar);

        if (isWordBound) {
          // Check for overlap
          const overlaps = usedRanges.some(([start, end]) => index < end && endIndex > start);

          if (!overlaps) {
            const firstEntityId = entityIds[0]!;
            const entry = this.gazetteer.get(firstEntityId);
            const entityType = entry?.entityType ?? 'ENTITY';
            mentions.push({
              text: text.substring(index, endIndex),
              startOffset: index,
              endOffset: endIndex,
              type: entityType,
              confidence: 0.8,
            });
            usedRanges.push([index, endIndex]);
          }
        }

        searchStart = index + 1;
      }
    }

    // Sort by offset
    mentions.sort((a, b) => a.startOffset - b.startOffset);
    return mentions;
  }

  /**
   * Entity candidate generation from knowledge graph lookup
   * Returns possible entity matches for a mention
   */
  generateCandidates(mentionText: string): EntityCandidate[] {
    const candidates: EntityCandidate[] = [];
    const lowerMention = mentionText.toLowerCase();

    // Exact match lookup
    const exactMatches = this.aliasIndex.get(lowerMention) ?? [];
    for (const entityId of exactMatches) {
      const entry = this.gazetteer.get(entityId);
      if (!entry) continue;

      const popularity = this.entityPopularity.get(entityId) ?? 0;
      candidates.push({
        entityId,
        name: entry.canonicalName,
        type: entry.entityType,
        score: 1.0,
        contextSimilarity: 0, // To be computed during disambiguation
        popularity,
        aliases: entry.aliases,
      });
    }

    // Partial match lookup (prefix and substring)
    for (const [alias, entityIds] of this.aliasIndex) {
      if (alias === lowerMention) continue; // Already handled

      // Check prefix match
      if (alias.startsWith(lowerMention) || lowerMention.startsWith(alias)) {
        const nameSimilarity = this.computeNameSimilarity(lowerMention, alias);
        if (nameSimilarity < 0.5) continue;

        for (const entityId of entityIds) {
          // Skip if already a candidate
          if (candidates.some((c) => c.entityId === entityId)) continue;

          const entry = this.gazetteer.get(entityId);
          if (!entry) continue;

          const popularity = this.entityPopularity.get(entityId) ?? 0;
          candidates.push({
            entityId,
            name: entry.canonicalName,
            type: entry.entityType,
            score: nameSimilarity,
            contextSimilarity: 0,
            popularity,
            aliases: entry.aliases,
          });
        }
      }
    }

    // Sort by initial score
    candidates.sort((a, b) => b.score - a.score);
    return candidates.slice(0, 10); // Limit candidates
  }

  /**
   * Entity disambiguation using context window similarity scoring
   * Ranks candidates based on surrounding text context
   */
  disambiguate(
    mentionText: string,
    mentionOffset: number,
    fullText: string,
    candidates: EntityCandidate[],
  ): EntityCandidate[] {
    if (candidates.length <= 1) return candidates;

    // Extract context window around mention
    const contextStart = Math.max(0, mentionOffset - this.contextWindowSize);
    const contextEnd = Math.min(
      fullText.length,
      mentionOffset + mentionText.length + this.contextWindowSize,
    );
    const contextWindow = fullText.substring(contextStart, contextEnd).toLowerCase();
    const contextTerms = new Set(contextWindow.split(/\s+/).filter((t) => t.length > 2));

    // Score each candidate
    for (const candidate of candidates) {
      let contextScore = 0;
      const entry = this.gazetteer.get(candidate.entityId);
      if (!entry) continue;

      // Check context overlap with entity metadata
      const entityTerms = new Set<string>();
      entityTerms.add(entry.canonicalName.toLowerCase());
      for (const alias of entry.aliases) {
        for (const word of alias.toLowerCase().split(/\s+/)) {
          entityTerms.add(word);
        }
      }
      if (entry.metadata) {
        for (const value of Object.values(entry.metadata)) {
          if (typeof value === 'string') {
            for (const word of value.toLowerCase().split(/\s+/)) {
              entityTerms.add(word);
            }
          }
        }
      }

      // Jaccard-like similarity between context and entity terms
      let intersection = 0;
      for (const term of contextTerms) {
        if (entityTerms.has(term)) {
          intersection++;
        }
      }
      const union = contextTerms.size + entityTerms.size - intersection;
      contextScore = union > 0 ? intersection / union : 0;

      candidate.contextSimilarity = contextScore;

      // Combined score: name similarity + context + popularity
      const nameSim = this.computeNameSimilarity(
        mentionText.toLowerCase(),
        entry.canonicalName.toLowerCase(),
      );
      const popScore = Math.min(1.0, candidate.popularity / 100);
      candidate.score = nameSim * 0.4 + contextScore * 0.4 + popScore * 0.2;
    }

    // Re-sort by combined score
    candidates.sort((a, b) => b.score - a.score);
    return candidates;
  }

  /**
   * Coreference resolution for pronouns
   * Links pronouns to their most likely referent
   */
  resolveCorereferences(text: string, mentions: RecognizedMention[]): CoreferenceChain[] {
    const chains: CoreferenceChain[] = [];
    const pronouns = ['he', 'she', 'it', 'they', 'him', 'her', 'them', 'his', 'its', 'their'];

    // Find pronoun positions
    const pronounPositions: Array<{ pronoun: string; offset: number }> = [];
    let currentOffset = 0;
    for (const word of text.split(/\s+/)) {
      if (pronouns.includes(word.toLowerCase().replace(/[^a-z]/g, ''))) {
        pronounPositions.push({
          pronoun: word.toLowerCase().replace(/[^a-z]/g, ''),
          offset: currentOffset,
        });
      }
      currentOffset += word.length + 1;
    }

    // For each pronoun, find the nearest preceding entity mention as referent
    for (const { pronoun, offset } of pronounPositions) {
      // Find nearest preceding PERSON or ORGANIZATION mention
      let bestMention: RecognizedMention | null = null;
      let bestDistance = Infinity;

      for (const mention of mentions) {
        if (mention.endOffset >= offset) continue; // Must precede pronoun

        // Gender agreement heuristic
        const isPerson = mention.type === 'PERSON';
        const isOrg = mention.type === 'ORGANIZATION';

        if ((pronoun === 'he' || pronoun === 'him' || pronoun === 'his') && !isPerson) continue;
        if ((pronoun === 'she' || pronoun === 'her') && !isPerson) continue;
        if (pronoun === 'it' && isPerson) continue;
        if (
          (pronoun === 'they' || pronoun === 'them' || pronoun === 'their') &&
          !isPerson &&
          !isOrg
        )
          continue;

        const distance = offset - mention.endOffset;
        if (distance < bestDistance) {
          bestDistance = distance;
          bestMention = mention;
        }
      }

      if (bestMention) {
        // Find or create chain
        let chain = chains.find((c) => c.referentName === bestMention!.text);
        if (!chain) {
          chain = {
            referentId: bestMention.text.toLowerCase().replace(/\s+/g, '_'),
            referentName: bestMention.text,
            mentions: [
              {
                text: bestMention.text,
                startOffset: bestMention.startOffset,
                endOffset: bestMention.endOffset,
              },
            ],
          };
          chains.push(chain);
        }
        chain.mentions.push({
          text: pronoun,
          startOffset: offset,
          endOffset: offset + pronoun.length,
        });
      }
    }

    return chains;
  }

  /**
   * Entity relationship extraction from text proximity
   * Entities mentioned close together likely have a relationship
   */
  extractRelationships(
    mentions: RecognizedMention[],
    maxProximityChars: number = 100,
  ): Array<{
    entity1: RecognizedMention;
    entity2: RecognizedMention;
    proximity: number;
    relationHint: string;
  }> {
    const relationships: Array<{
      entity1: RecognizedMention;
      entity2: RecognizedMention;
      proximity: number;
      relationHint: string;
    }> = [];

    for (let i = 0; i < mentions.length; i++) {
      for (let j = i + 1; j < mentions.length; j++) {
        const mentionI = mentions[i]!;
        const mentionJ = mentions[j]!;
        const distance = mentionJ.startOffset - mentionI.endOffset;
        if (distance > maxProximityChars) break; // Sorted by offset, so no need to check further
        if (distance < 0) continue;

        const proximity = 1 - distance / maxProximityChars;
        const relationHint = this.inferRelationType(mentionI, mentionJ);

        relationships.push({
          entity1: mentionI,
          entity2: mentionJ,
          proximity,
          relationHint,
        });
      }
    }

    return relationships;
  }

  /** Infer relationship type between two entity mentions */
  private inferRelationType(entity1: RecognizedMention, entity2: RecognizedMention): string {
    if (entity1.type === 'PERSON' && entity2.type === 'ORGANIZATION') return 'affiliated_with';
    if (entity1.type === 'PERSON' && entity2.type === 'LOCATION') return 'located_in';
    if (entity1.type === 'ORGANIZATION' && entity2.type === 'LOCATION') return 'headquartered_in';
    if (entity1.type === 'PERSON' && entity2.type === 'PERSON') return 'associated_with';
    if (entity1.type === 'ORGANIZATION' && entity2.type === 'ORGANIZATION') return 'related_to';
    return 'mentioned_with';
  }

  /**
   * Linking confidence scoring
   * Computes multi-dimensional confidence for entity links
   */
  computeLinkConfidence(
    mentionText: string,
    candidate: EntityCandidate,
    _contextWindow: string,
  ): LinkConfidence {
    const entry = this.gazetteer.get(candidate.entityId);
    const canonicalName = entry?.canonicalName ?? candidate.name;

    // Name similarity
    const nameSimilarity = this.computeNameSimilarity(
      mentionText.toLowerCase(),
      canonicalName.toLowerCase(),
    );

    // Context match
    const contextMatch = candidate.contextSimilarity;

    // Popularity factor
    const popularity = Math.min(1.0, (candidate.popularity ?? 0) / 100);

    // Coherence (how well this entity fits with other linked entities)
    const coherence = 0.5; // Base coherence without other context

    // Overall confidence
    const overall = nameSimilarity * 0.3 + contextMatch * 0.3 + popularity * 0.2 + coherence * 0.2;

    return {
      overall: Math.min(1.0, overall),
      nameSimilarity,
      contextMatch,
      popularity,
      coherence,
    };
  }

  /**
   * Full entity linking pipeline
   * Recognizes entities, generates candidates, disambiguates, and links
   */
  linkEntities(text: string): EntityLink[] {
    const mentions = this.recognizeEntities(text);
    const links: EntityLink[] = [];

    for (const mention of mentions) {
      const candidates = this.generateCandidates(mention.text);
      if (candidates.length === 0) continue;

      const disambiguated = this.disambiguate(mention.text, mention.startOffset, text, candidates);
      const bestCandidate = disambiguated[0];
      if (!bestCandidate) continue;

      const contextStart = Math.max(0, mention.startOffset - this.contextWindowSize);
      const contextEnd = Math.min(text.length, mention.endOffset + this.contextWindowSize);
      const contextWindow = text.substring(contextStart, contextEnd);

      const confidence = this.computeLinkConfidence(mention.text, bestCandidate, contextWindow);

      links.push({
        mention: mention.text,
        entityId: bestCandidate.entityId,
        entityName: bestCandidate.name,
        entityType: bestCandidate.type,
        confidence,
        startOffset: mention.startOffset,
        endOffset: mention.endOffset,
        contextWindow,
      });
    }

    return links;
  }

  /** Compute string similarity using Levenshtein-based approach */
  private computeNameSimilarity(a: string, b: string): number {
    if (a === b) return 1.0;
    if (a.length === 0 || b.length === 0) return 0;

    const maxLen = Math.max(a.length, b.length);
    const distance = this.levenshteinDistance(a, b);
    return 1 - distance / maxLen;
  }

  /** Levenshtein edit distance */
  private levenshteinDistance(a: string, b: string): number {
    const m = a.length;
    const n = b.length;

    // Use two rows for space optimization
    let prev = new Array(n + 1).fill(0);
    let curr = new Array(n + 1).fill(0);

    for (let j = 0; j <= n; j++) {
      prev[j] = j;
    }

    for (let i = 1; i <= m; i++) {
      curr[0] = i;
      for (let j = 1; j <= n; j++) {
        if (a[i - 1] === b[j - 1]) {
          curr[j] = prev[j - 1];
        } else {
          curr[j] = 1 + Math.min(prev[j - 1], prev[j], curr[j - 1]);
        }
      }
      [prev, curr] = [curr, prev];
    }

    return prev[n];
  }

  /** Get gazetteer statistics */
  getStats(): { entities: number; aliases: number; patterns: number } {
    return {
      entities: this.gazetteer.size,
      aliases: this.aliasIndex.size,
      patterns: this.patternMatchers.length,
    };
  }
}
