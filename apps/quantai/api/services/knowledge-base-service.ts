// ============================================================================
// QuantAI - Knowledge Base Service
// Document upload, indexing, semantic query, context retrieval
// ============================================================================

interface Document { id: string; userId: string; filename: string; content: string; metadata: DocMetadata; chunks: DocumentChunk[]; status: 'uploaded' | 'indexing' | 'indexed' | 'error'; uploadedAt: string; indexedAt?: string; size: number; }
interface DocMetadata { title: string; author?: string; type: 'pdf' | 'text' | 'markdown' | 'html' | 'code'; tags: string[]; language: string; version?: string; }
interface DocumentChunk { id: string; docId: string; content: string; embedding: number[]; position: number; tokenCount: number; metadata: Record<string, string>; }
interface QueryResult { query: string; results: RelevantChunk[]; totalResults: number; processingTimeMs: number; confidence: number; }
interface RelevantChunk { chunk: DocumentChunk; score: number; docTitle: string; docId: string; context: string; }
interface KBStats { totalDocuments: number; totalChunks: number; totalTokens: number; avgChunkSize: number; topTags: { tag: string; count: number }[]; lastUpdated: string; storageUsed: number; }

class KnowledgeBaseService {
  private documents: Map<string, Document> = new Map();
  private userDocs: Map<string, string[]> = new Map();
  private counter: number = 0;

  private genId(prefix: string): string { return `${prefix}_${Date.now().toString(36)}_${(++this.counter).toString(36)}`; }

  private tokenize(text: string): number { return Math.ceil(text.length / 4); }

  private generateEmbedding(text: string, dims: number = 128): number[] {
    const embedding: number[] = [];
    let hash = 0;
    for (let i = 0; i < text.length; i++) { hash = ((hash << 5) - hash) + text.charCodeAt(i); hash = hash & hash; }
    for (let i = 0; i < dims; i++) {
      const val = Math.sin(hash * (i + 1) * 0.01) * Math.cos(hash * (i + 1) * 0.007);
      embedding.push(Math.round(val * 10000) / 10000);
    }
    const norm = Math.sqrt(embedding.reduce((s, v) => s + v * v, 0));
    return embedding.map(v => Math.round((v / norm) * 10000) / 10000);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; normA += a[i] * a[i]; normB += b[i] * b[i]; }
    return normA > 0 && normB > 0 ? dot / (Math.sqrt(normA) * Math.sqrt(normB)) : 0;
  }

  async uploadDocument(userId: string, filename: string, content: string, metadata: Partial<DocMetadata>): Promise<Document> {
    if (!content || content.length < 10) throw new Error('Document content too short');
    if (content.length > 10000000) throw new Error('Document too large (max 10MB)');

    const doc: Document = {
      id: this.genId('doc'), userId, filename, content,
      metadata: { title: metadata.title || filename, author: metadata.author, type: metadata.type || 'text', tags: metadata.tags || [], language: metadata.language || 'en', version: metadata.version },
      chunks: [], status: 'uploaded', uploadedAt: new Date().toISOString(), size: content.length,
    };

    this.documents.set(doc.id, doc);
    const userDocList = this.userDocs.get(userId) || [];
    userDocList.push(doc.id);
    this.userDocs.set(userId, userDocList);
    return doc;
  }

  async index(docId: string): Promise<Document> {
    const doc = this.documents.get(docId);
    if (!doc) throw new Error('Document not found');
    if (doc.status === 'indexed') return doc;

    doc.status = 'indexing';
    const chunkSize = 500;
    const overlap = 50;
    const chunks: DocumentChunk[] = [];
    let position = 0;
    let start = 0;

    while (start < doc.content.length) {
      const end = Math.min(start + chunkSize, doc.content.length);
      const chunkContent = doc.content.substring(start, end);
      const embedding = this.generateEmbedding(chunkContent);

      chunks.push({
        id: this.genId('chunk'), docId: doc.id, content: chunkContent,
        embedding, position, tokenCount: this.tokenize(chunkContent),
        metadata: { title: doc.metadata.title, position: String(position) },
      });

      position++;
      start = end - overlap;
      if (start >= doc.content.length - overlap) break;
    }

    doc.chunks = chunks;
    doc.status = 'indexed';
    doc.indexedAt = new Date().toISOString();
    return doc;
  }

  async query(userId: string, question: string, opts?: { limit?: number; threshold?: number }): Promise<QueryResult> {
    const startTime = Date.now();
    const queryEmbedding = this.generateEmbedding(question);
    const limit = opts?.limit || 5;
    const threshold = opts?.threshold || 0.3;

    const userDocIds = this.userDocs.get(userId) || [];
    const allChunks: RelevantChunk[] = [];

    for (const docId of userDocIds) {
      const doc = this.documents.get(docId);
      if (!doc || doc.status !== 'indexed') continue;

      for (const chunk of doc.chunks) {
        const score = this.cosineSimilarity(queryEmbedding, chunk.embedding);
        if (score >= threshold) {
          allChunks.push({ chunk, score: Math.round(score * 10000) / 10000, docTitle: doc.metadata.title, docId: doc.id, context: chunk.content.substring(0, 200) });
        }
      }
    }

    allChunks.sort((a, b) => b.score - a.score);
    const results = allChunks.slice(0, limit);
    const confidence = results.length > 0 ? results[0].score : 0;

    return { query: question, results, totalResults: allChunks.length, processingTimeMs: Date.now() - startTime, confidence };
  }

  async getRelevantContext(userId: string, question: string, maxTokens: number = 2000): Promise<{ context: string; sources: { docId: string; title: string }[]; tokenCount: number }> {
    const queryResult = await this.query(userId, question, { limit: 10, threshold: 0.2 });
    let context = '';
    let tokenCount = 0;
    const sources: { docId: string; title: string }[] = [];
    const seenDocs = new Set<string>();

    for (const result of queryResult.results) {
      const chunkTokens = this.tokenize(result.chunk.content);
      if (tokenCount + chunkTokens > maxTokens) break;
      context += result.chunk.content + '\n\n';
      tokenCount += chunkTokens;
      if (!seenDocs.has(result.docId)) { sources.push({ docId: result.docId, title: result.docTitle }); seenDocs.add(result.docId); }
    }

    return { context: context.trim(), sources, tokenCount };
  }

  async deleteDocument(docId: string, userId: string): Promise<boolean> {
    const doc = this.documents.get(docId);
    if (!doc) throw new Error('Document not found');
    if (doc.userId !== userId) throw new Error('Permission denied');
    this.documents.delete(docId);
    const userDocList = this.userDocs.get(userId) || [];
    const idx = userDocList.indexOf(docId);
    if (idx >= 0) userDocList.splice(idx, 1);
    return true;
  }

  async getStats(userId: string): Promise<KBStats> {
    const docIds = this.userDocs.get(userId) || [];
    const docs = docIds.map(id => this.documents.get(id)).filter((d): d is Document => !!d);
    const totalChunks = docs.reduce((s, d) => s + d.chunks.length, 0);
    const totalTokens = docs.reduce((s, d) => s + d.chunks.reduce((cs, c) => cs + c.tokenCount, 0), 0);
    const tagMap = new Map<string, number>();
    docs.forEach(d => d.metadata.tags.forEach(t => tagMap.set(t, (tagMap.get(t) || 0) + 1)));
    const topTags = Array.from(tagMap.entries()).map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count).slice(0, 10);
    return { totalDocuments: docs.length, totalChunks, totalTokens, avgChunkSize: totalChunks > 0 ? Math.round(totalTokens / totalChunks) : 0, topTags, lastUpdated: docs[docs.length - 1]?.indexedAt || '', storageUsed: docs.reduce((s, d) => s + d.size, 0) };
  }

  async listDocuments(userId: string, opts?: { status?: string; tag?: string; limit?: number }): Promise<Omit<Document, 'content' | 'chunks'>[]> {
    const docIds = this.userDocs.get(userId) || [];
    let docs = docIds.map(id => this.documents.get(id)).filter((d): d is Document => !!d);
    if (opts?.status) docs = docs.filter(d => d.status === opts.status);
    if (opts?.tag) docs = docs.filter(d => d.metadata.tags.includes(opts.tag!));
    return docs.slice(0, opts?.limit || 50).map(({ content, chunks, ...rest }) => rest);
  }

  async updateMetadata(docId: string, metadata: Partial<DocMetadata>): Promise<Document> {
    const doc = this.documents.get(docId);
    if (!doc) throw new Error('Document not found');
    Object.assign(doc.metadata, metadata);
    return doc;
  }
}

export const knowledgeBaseService = new KnowledgeBaseService();
export { KnowledgeBaseService };
