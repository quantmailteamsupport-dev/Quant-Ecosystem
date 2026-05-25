// ============================================================================
// Search Package - Semantic Search
// ============================================================================

import type { SemanticConfig, TFIDFVector, QueryIntent, CooccurrenceMatrix } from '../types';

interface IndexedDocument {
  id: string;
  terms: Map<string, number>; // term -> raw count
  totalTerms: number;
  bm25Score?: number;
}

/** Semantic search engine with TF-IDF, query expansion, and hybrid scoring */
export class SemanticSearch {
  private config: SemanticConfig;
  private documents: Map<string, IndexedDocument>;
  private documentFrequency: Map<string, number>;
  private tfidfVectors: Map<string, TFIDFVector>;
  private cooccurrence: Map<string, Map<string, number>>;
  private totalDocuments: number;
  private vocabulary: Set<string>;

  constructor(config: Partial<SemanticConfig> = {}) {
    this.config = {
      alpha: config.alpha ?? 0.6,
      maxExpansionTerms: config.maxExpansionTerms ?? 5,
      minTermFrequency: config.minTermFrequency ?? 2,
      maxDocFrequencyRatio: config.maxDocFrequencyRatio ?? 0.8,
      diversityLambda: config.diversityLambda ?? 0.3,
      intentClassificationEnabled: config.intentClassificationEnabled ?? true,
      cooccurrenceWindowSize: config.cooccurrenceWindowSize ?? 5,
    };
    this.documents = new Map();
    this.documentFrequency = new Map();
    this.tfidfVectors = new Map();
    this.cooccurrence = new Map();
    this.totalDocuments = 0;
    this.vocabulary = new Set();
  }

  /** Index a document */
  indexDocument(docId: string, text: string): void {
    const terms = this.tokenize(text);
    const termCounts = new Map<string, number>();

    for (const term of terms) {
      termCounts.set(term, (termCounts.get(term) ?? 0) + 1);
      this.vocabulary.add(term);
    }

    // Update document frequency
    for (const term of termCounts.keys()) {
      this.documentFrequency.set(term, (this.documentFrequency.get(term) ?? 0) + 1);
    }

    this.documents.set(docId, {
      id: docId,
      terms: termCounts,
      totalTerms: terms.length,
    });
    this.totalDocuments++;

    // Update co-occurrence matrix
    this.updateCooccurrence(terms);

    // Recompute TF-IDF vector for this document
    this.computeTFIDFVector(docId);
  }

  /** Tokenize text into terms */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 1);
  }

  /** Update co-occurrence matrix from a document's terms */
  private updateCooccurrence(terms: string[]): void {
    const windowSize = this.config.cooccurrenceWindowSize;

    for (let i = 0; i < terms.length; i++) {
      const term = terms[i]!;
      if (!this.cooccurrence.has(term)) {
        this.cooccurrence.set(term, new Map());
      }
      const termCooc = this.cooccurrence.get(term)!;

      // Look at terms within window
      const start = Math.max(0, i - windowSize);
      const end = Math.min(terms.length, i + windowSize + 1);

      for (let j = start; j < end; j++) {
        if (j === i) continue;
        const neighbor = terms[j]!;
        termCooc.set(neighbor, (termCooc.get(neighbor) ?? 0) + 1);
      }
    }
  }

  /**
   * Compute TF-IDF vector for a document
   * tf = log(1 + count)
   * idf = log(N / df)
   */
  computeTFIDFVector(docId: string): TFIDFVector | null {
    const doc = this.documents.get(docId);
    if (!doc) return null;

    const terms = new Map<string, number>();
    let magnitude = 0;

    for (const [term, count] of doc.terms) {
      const df = this.documentFrequency.get(term) ?? 0;
      if (df === 0) continue;

      // Skip terms that appear in too many documents
      if (df / this.totalDocuments > this.config.maxDocFrequencyRatio) continue;

      // tf = log(1 + count)
      const tf = Math.log(1 + count);
      // idf = log(N / df)
      const idf = Math.log(this.totalDocuments / df);
      const tfidf = tf * idf;

      terms.set(term, tfidf);
      magnitude += tfidf * tfidf;
    }

    magnitude = Math.sqrt(magnitude);

    const vector: TFIDFVector = { documentId: docId, terms, magnitude };
    this.tfidfVectors.set(docId, vector);
    return vector;
  }

  /**
   * Compute cosine similarity between two TF-IDF vectors
   */
  cosineSimilarity(vectorA: TFIDFVector, vectorB: TFIDFVector): number {
    if (vectorA.magnitude === 0 || vectorB.magnitude === 0) return 0;

    let dotProduct = 0;

    // Iterate over the smaller vector for efficiency
    const [smaller, larger] =
      vectorA.terms.size <= vectorB.terms.size
        ? [vectorA.terms, vectorB.terms]
        : [vectorB.terms, vectorA.terms];

    for (const [term, weightA] of smaller) {
      const weightB = larger.get(term);
      if (weightB !== undefined) {
        dotProduct += weightA * weightB;
      }
    }

    return dotProduct / (vectorA.magnitude * vectorB.magnitude);
  }

  /**
   * Compute TF-IDF vector for a query
   */
  computeQueryVector(queryTerms: string[]): TFIDFVector {
    const termCounts = new Map<string, number>();
    for (const term of queryTerms) {
      termCounts.set(term, (termCounts.get(term) ?? 0) + 1);
    }

    const terms = new Map<string, number>();
    let magnitude = 0;

    for (const [term, count] of termCounts) {
      const df = this.documentFrequency.get(term) ?? 0;
      if (df === 0) continue;

      const tf = Math.log(1 + count);
      const idf = Math.log(this.totalDocuments / df);
      const tfidf = tf * idf;

      terms.set(term, tfidf);
      magnitude += tfidf * tfidf;
    }

    magnitude = Math.sqrt(magnitude);
    return { documentId: '__query__', terms, magnitude };
  }

  /**
   * Query expansion using term co-occurrence matrix
   * Finds terms that frequently co-occur with query terms
   */
  expandQuery(queryTerms: string[]): string[] {
    const expansionScores = new Map<string, number>();

    for (const queryTerm of queryTerms) {
      const coocTerms = this.cooccurrence.get(queryTerm);
      if (!coocTerms) continue;

      for (const [term, count] of coocTerms) {
        if (queryTerms.includes(term)) continue; // Skip existing query terms

        // Weight by co-occurrence frequency and IDF
        const df = this.documentFrequency.get(term) ?? 0;
        if (df < this.config.minTermFrequency) continue;

        const idf = this.totalDocuments > 0 ? Math.log(this.totalDocuments / df) : 0;
        const score = count * idf;
        expansionScores.set(term, (expansionScores.get(term) ?? 0) + score);
      }
    }

    // Sort by score and take top expansion terms
    const sorted = Array.from(expansionScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, this.config.maxExpansionTerms);

    return sorted.map(([term]) => term);
  }

  /** Get the co-occurrence matrix for analysis */
  getCooccurrenceMatrix(topTerms: number = 50): CooccurrenceMatrix {
    // Get most frequent terms
    const termFreqs = Array.from(this.documentFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, topTerms);

    const terms = termFreqs.map(([term]) => term);
    const matrix: number[][] = Array.from({ length: terms.length }, () =>
      new Array(terms.length).fill(0),
    );

    for (let i = 0; i < terms.length; i++) {
      const termI = terms[i]!;
      const coocMap = this.cooccurrence.get(termI);
      if (!coocMap) continue;
      for (let j = 0; j < terms.length; j++) {
        if (i === j) continue;
        const termJ = terms[j]!;
        matrix[i]![j] = coocMap.get(termJ) ?? 0;
      }
    }

    return {
      terms,
      matrix,
      windowSize: this.config.cooccurrenceWindowSize,
      documentCount: this.totalDocuments,
    };
  }

  /**
   * BM25 scoring for a query-document pair
   * BM25(D, Q) = sum(IDF(qi) * (tf * (k1+1)) / (tf + k1 * (1 - b + b * |D|/avgdl)))
   */
  private computeBM25Score(
    docId: string,
    queryTerms: string[],
    k1: number = 1.2,
    b: number = 0.75,
  ): number {
    const doc = this.documents.get(docId);
    if (!doc) return 0;

    // Compute average document length
    let totalLength = 0;
    for (const d of this.documents.values()) {
      totalLength += d.totalTerms;
    }
    const avgDL = this.totalDocuments > 0 ? totalLength / this.totalDocuments : 1;

    let score = 0;

    for (const term of queryTerms) {
      const tf = doc.terms.get(term) ?? 0;
      if (tf === 0) continue;

      const df = this.documentFrequency.get(term) ?? 0;
      // IDF with smoothing
      const idf = Math.log((this.totalDocuments - df + 0.5) / (df + 0.5) + 1);

      // BM25 term score
      const numerator = tf * (k1 + 1);
      const denominator = tf + k1 * (1 - b + (b * doc.totalTerms) / avgDL);
      score += (idf * numerator) / denominator;
    }

    return score;
  }

  /**
   * Hybrid scoring: alpha * BM25_score + (1-alpha) * semantic_similarity
   */
  hybridSearch(
    query: string,
    topN: number = 10,
  ): Array<{ docId: string; score: number; bm25: number; semantic: number }> {
    const queryTerms = this.tokenize(query);
    if (queryTerms.length === 0) return [];

    // Expand query
    const expandedTerms = [...queryTerms, ...this.expandQuery(queryTerms)];

    // Compute query vector for semantic similarity
    const queryVector = this.computeQueryVector(expandedTerms);

    const results: Array<{ docId: string; score: number; bm25: number; semantic: number }> = [];

    for (const docId of this.documents.keys()) {
      // BM25 score
      const bm25Score = this.computeBM25Score(docId, expandedTerms);

      // Semantic similarity
      const docVector = this.tfidfVectors.get(docId);
      const semanticScore = docVector ? this.cosineSimilarity(queryVector, docVector) : 0;

      // Hybrid combination
      const hybridScore = this.config.alpha * bm25Score + (1 - this.config.alpha) * semanticScore;

      if (hybridScore > 0) {
        results.push({ docId, score: hybridScore, bm25: bm25Score, semantic: semanticScore });
      }
    }

    // Sort by hybrid score
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topN);
  }

  /**
   * Query intent classification (navigational/informational/transactional)
   * Uses keyword patterns and query structure
   */
  classifyQueryIntent(query: string): QueryIntent {
    if (!this.config.intentClassificationEnabled) return 'informational';

    const lowerQuery = query.toLowerCase().trim();

    // Navigational patterns: looking for specific entity/page
    const navigationalPatterns = [
      /^go to /,
      /^open /,
      /\.com|\.org|\.net|\.io/,
      /^www\./,
      /^(facebook|twitter|google|youtube|amazon|github)/,
      /^@/,
    ];

    for (const pattern of navigationalPatterns) {
      if (pattern.test(lowerQuery)) return 'navigational';
    }

    // Transactional patterns: looking to do something
    const transactionalPatterns = [
      /^(buy|purchase|order|subscribe|download|install|sign up|register)/,
      /\b(price|cost|deal|discount|coupon|free trial)\b/,
      /^(create|make|build|generate|upload)/,
      /\b(add to cart|checkout|pay)\b/,
    ];

    for (const pattern of transactionalPatterns) {
      if (pattern.test(lowerQuery)) return 'transactional';
    }

    // Informational patterns: seeking information
    const informationalPatterns = [
      /^(what|who|when|where|why|how|which)/,
      /\b(guide|tutorial|explained|overview|definition|meaning)\b/,
      /\b(best|top|compare|vs|versus|difference)\b/,
      /\?$/,
    ];

    for (const pattern of informationalPatterns) {
      if (pattern.test(lowerQuery)) return 'informational';
    }

    // Default to informational
    return 'informational';
  }

  /**
   * Document re-ranking with diversity
   * Uses MMR-style approach to ensure result diversity
   */
  rerankWithDiversity(
    results: Array<{ docId: string; score: number }>,
    topN: number,
  ): Array<{ docId: string; score: number }> {
    const lambda = this.config.diversityLambda;
    const selected: Array<{ docId: string; score: number }> = [];
    const remaining = [...results];

    // Normalize scores
    const firstResult = remaining[0];
    const maxScore = firstResult ? firstResult.score : 1;

    while (selected.length < topN && remaining.length > 0) {
      let bestIndex = 0;
      let bestScore = -Infinity;

      for (let i = 0; i < remaining.length; i++) {
        const candidate = remaining[i]!;
        const relevance = maxScore > 0 ? candidate.score / maxScore : 0;

        // Compute max similarity to already selected documents
        let maxSimilarity = 0;
        for (const sel of selected) {
          const vecA = this.tfidfVectors.get(candidate.docId);
          const vecB = this.tfidfVectors.get(sel.docId);
          if (vecA && vecB) {
            const sim = this.cosineSimilarity(vecA, vecB);
            maxSimilarity = Math.max(maxSimilarity, sim);
          }
        }

        // MMR score
        const mmrScore = (1 - lambda) * relevance + lambda * (1 - maxSimilarity);

        if (mmrScore > bestScore) {
          bestScore = mmrScore;
          bestIndex = i;
        }
      }

      const chosen = remaining[bestIndex]!;
      selected.push({ docId: chosen.docId, score: bestScore });
      remaining.splice(bestIndex, 1);
    }

    return selected;
  }

  /** Search with full pipeline: intent classification, expansion, hybrid scoring, diversity */
  search(
    query: string,
    topN: number = 10,
  ): {
    results: Array<{ docId: string; score: number; bm25: number; semantic: number }>;
    intent: QueryIntent;
    expandedTerms: string[];
  } {
    const intent = this.classifyQueryIntent(query);
    const queryTerms = this.tokenize(query);
    const expansionTerms = this.expandQuery(queryTerms);
    const expandedTerms = [...queryTerms, ...expansionTerms];

    const results = this.hybridSearch(query, topN * 2); // Get more for diversity re-ranking
    const diverseResults = this.rerankWithDiversity(
      results.map((r) => ({ docId: r.docId, score: r.score })),
      topN,
    );

    // Map back to full result objects
    const resultMap = new Map(results.map((r) => [r.docId, r]));
    const finalResults = diverseResults.map((dr) => {
      const full = resultMap.get(dr.docId);
      return full ?? { docId: dr.docId, score: dr.score, bm25: 0, semantic: 0 };
    });

    return { results: finalResults, intent, expandedTerms };
  }

  /** Get index statistics */
  getStats(): { documents: number; vocabulary: number; avgDocLength: number } {
    let totalLength = 0;
    for (const doc of this.documents.values()) {
      totalLength += doc.totalTerms;
    }
    return {
      documents: this.totalDocuments,
      vocabulary: this.vocabulary.size,
      avgDocLength: this.totalDocuments > 0 ? totalLength / this.totalDocuments : 0,
    };
  }
}
