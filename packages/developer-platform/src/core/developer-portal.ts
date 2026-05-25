// ============================================================================
// Quant Developer Platform - Developer Portal
// ============================================================================

import {
  PortalDoc,
  Tutorial,
  TutorialStep,
  ChangelogEntry,
  CodeSample,
  APIReference,
  RouteDefinition,
  ParamDefinition,
} from '../types';

// ============================================================================
// Helpers
// ============================================================================

function generateId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// ============================================================================
// Developer Portal Class
// ============================================================================

export class DeveloperPortal {
  private docs: Map<string, PortalDoc> = new Map();
  private tutorials: Map<string, Tutorial> = new Map();
  private changelog: Map<string, ChangelogEntry> = new Map();
  private apiReferences: Map<string, APIReference> = new Map();

  /**
   * Add structured documentation with sections and code examples
   */
  public addDocumentation(params: {
    title: string;
    content: string;
    section: string;
    order?: number;
    tags?: string[];
    codeSamples?: CodeSample[];
  }): PortalDoc {
    const now = Date.now();
    const doc: PortalDoc = {
      id: generateId(),
      title: params.title,
      slug: slugify(params.title),
      content: params.content,
      section: params.section,
      order: params.order || 0,
      createdAt: now,
      updatedAt: now,
      tags: params.tags || [],
      codeSamples: params.codeSamples || [],
    };

    this.docs.set(doc.id, doc);
    return doc;
  }

  /**
   * Add a step-by-step tutorial with prerequisites
   */
  public addTutorial(params: {
    title: string;
    description: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    estimatedTime: number;
    prerequisites?: string[];
    steps: TutorialStep[];
    tags?: string[];
  }): Tutorial {
    const tutorial: Tutorial = {
      id: generateId(),
      title: params.title,
      description: params.description,
      difficulty: params.difficulty,
      estimatedTime: params.estimatedTime,
      prerequisites: params.prerequisites || [],
      steps: params.steps,
      tags: params.tags || [],
    };

    this.tutorials.set(tutorial.id, tutorial);
    return tutorial;
  }

  /**
   * Add a versioned changelog entry
   */
  public addChangelog(params: {
    version: string;
    type: 'added' | 'fixed' | 'changed' | 'deprecated' | 'removed' | 'security';
    title: string;
    description: string;
    breakingChange?: boolean;
    migrationNotes?: string;
  }): ChangelogEntry {
    const entry: ChangelogEntry = {
      id: generateId(),
      version: params.version,
      date: Date.now(),
      type: params.type,
      title: params.title,
      description: params.description,
      breakingChange: params.breakingChange || false,
      migrationNotes: params.migrationNotes,
    };

    this.changelog.set(entry.id, entry);
    return entry;
  }

  /**
   * Full-text search across all documentation
   */
  public searchDocs(query: string): Array<{ type: 'doc' | 'tutorial' | 'changelog'; id: string; title: string; snippet: string; score: number }> {
    const results: Array<{ type: 'doc' | 'tutorial' | 'changelog'; id: string; title: string; snippet: string; score: number }> = [];
    const queryLower = query.toLowerCase();
    const queryTerms = queryLower.split(/\s+/);

    // Search docs
    for (const doc of this.docs.values()) {
      const score = this.calculateSearchScore(queryTerms, [doc.title, doc.content, doc.section, ...doc.tags]);
      if (score > 0) {
        const snippet = this.extractSnippet(doc.content, queryLower);
        results.push({ type: 'doc', id: doc.id, title: doc.title, snippet, score });
      }
    }

    // Search tutorials
    for (const tutorial of this.tutorials.values()) {
      const stepContent = tutorial.steps.map(s => s.content).join(' ');
      const score = this.calculateSearchScore(queryTerms, [tutorial.title, tutorial.description, stepContent, ...tutorial.tags]);
      if (score > 0) {
        const snippet = this.extractSnippet(tutorial.description, queryLower);
        results.push({ type: 'tutorial', id: tutorial.id, title: tutorial.title, snippet, score });
      }
    }

    // Search changelog
    for (const entry of this.changelog.values()) {
      const score = this.calculateSearchScore(queryTerms, [entry.title, entry.description, entry.version]);
      if (score > 0) {
        const snippet = this.extractSnippet(entry.description, queryLower);
        results.push({ type: 'changelog', id: entry.id, title: entry.title, snippet, score });
      }
    }

    // Sort by score descending
    return results.sort((a, b) => b.score - a.score);
  }

  private calculateSearchScore(queryTerms: string[], fields: string[]): number {
    let score = 0;
    const combinedText = fields.join(' ').toLowerCase();

    for (const term of queryTerms) {
      if (combinedText.includes(term)) {
        score += 1;
        // Bonus for title matches
        if (fields[0].toLowerCase().includes(term)) {
          score += 2;
        }
        // Bonus for exact word match
        if (combinedText.includes(` ${term} `) || combinedText.startsWith(term)) {
          score += 0.5;
        }
      }
    }

    return score;
  }

  private extractSnippet(content: string, query: string): string {
    const lowerContent = content.toLowerCase();
    const index = lowerContent.indexOf(query);
    if (index === -1) {
      return content.substring(0, 150) + (content.length > 150 ? '...' : '');
    }
    const start = Math.max(0, index - 50);
    const end = Math.min(content.length, index + query.length + 100);
    let snippet = content.substring(start, end);
    if (start > 0) snippet = '...' + snippet;
    if (end < content.length) snippet = snippet + '...';
    return snippet;
  }

  /**
   * Get curated onboarding flow for new developers
   */
  public getGettingStarted(): {
    welcome: string;
    steps: Array<{ order: number; title: string; description: string; docId?: string; tutorialId?: string }>;
    tutorials: Tutorial[];
  } {
    // Find docs in the getting-started section
    const gettingStartedDocs = Array.from(this.docs.values())
      .filter(d => d.section === 'getting-started')
      .sort((a, b) => a.order - b.order);

    // Find beginner tutorials
    const beginnerTutorials = Array.from(this.tutorials.values())
      .filter(t => t.difficulty === 'beginner')
      .slice(0, 5);

    const steps = gettingStartedDocs.map((doc, index) => ({
      order: index + 1,
      title: doc.title,
      description: doc.content.substring(0, 200),
      docId: doc.id,
    }));

    return {
      welcome: 'Welcome to the Quant Developer Platform! Follow these steps to get started.',
      steps: steps.length > 0 ? steps : [
        { order: 1, title: 'Create an Account', description: 'Sign up for a developer account to get API access.' },
        { order: 2, title: 'Get API Keys', description: 'Generate your API keys from the dashboard.' },
        { order: 3, title: 'Make Your First Request', description: 'Use your API key to make your first API call.' },
        { order: 4, title: 'Explore the API', description: 'Browse the API reference to discover available endpoints.' },
      ],
      tutorials: beginnerTutorials,
    };
  }

  /**
   * Auto-generate API reference documentation from route definitions
   */
  public generateAPIReference(routes: RouteDefinition[]): APIReference[] {
    const references: APIReference[] = [];

    for (const route of routes) {
      const params: ParamDefinition[] = [
        ...(route.pathParams || []),
        ...(route.queryParams || []),
      ];

      const reference: APIReference = {
        endpoint: route.path,
        method: route.method,
        description: route.description,
        params,
        requestBody: route.bodyType,
        responseBody: route.responseType,
        examples: this.generateExampleCode(route),
        rateLimit: route.paginated ? '100 requests/minute' : '1000 requests/minute',
      };

      references.push(reference);
      this.apiReferences.set(`${route.method}:${route.path}`, reference);
    }

    return references;
  }

  private generateExampleCode(route: RouteDefinition): CodeSample[] {
    const samples: CodeSample[] = [];

    // Generate curl example
    let curlCmd = `curl -X ${route.method} '${route.path}'`;
    curlCmd += ` \\\n  -H 'Authorization: Bearer YOUR_API_KEY'`;
    if (route.bodyType && (route.method === 'POST' || route.method === 'PUT' || route.method === 'PATCH')) {
      curlCmd += ` \\\n  -H 'Content-Type: application/json'`;
      curlCmd += ` \\\n  -d '{}'`;
    }

    samples.push({
      id: generateId(),
      language: 'bash',
      title: 'cURL',
      code: curlCmd,
      description: `${route.method} request using cURL`,
      runnable: false,
    });

    // Generate TypeScript example
    let tsCode = `const response = await client.${route.operationId}(`;
    const tsParams: string[] = [];
    if (route.pathParams) {
      for (const param of route.pathParams) {
        tsParams.push(`'${param.name}_value'`);
      }
    }
    if (route.bodyType) {
      tsParams.push('{ /* request body */ }');
    }
    tsCode += tsParams.join(', ');
    tsCode += `);\nconsole.log(response);`;

    samples.push({
      id: generateId(),
      language: 'typescript',
      title: 'TypeScript',
      code: tsCode,
      description: `${route.method} request using the TypeScript SDK`,
      runnable: true,
    });

    return samples;
  }

  /**
   * Get documentation by ID
   */
  public getDoc(docId: string): PortalDoc | null {
    return this.docs.get(docId) || null;
  }

  /**
   * Get tutorial by ID
   */
  public getTutorial(tutorialId: string): Tutorial | null {
    return this.tutorials.get(tutorialId) || null;
  }

  /**
   * Get changelog entries filtered by version
   */
  public getChangelog(version?: string): ChangelogEntry[] {
    let entries = Array.from(this.changelog.values());
    if (version) {
      entries = entries.filter(e => e.version === version);
    }
    return entries.sort((a, b) => b.date - a.date);
  }

  /**
   * Get all docs for a section
   */
  public getSection(section: string): PortalDoc[] {
    return Array.from(this.docs.values())
      .filter(d => d.section === section)
      .sort((a, b) => a.order - b.order);
  }

  /**
   * List all available sections
   */
  public listSections(): string[] {
    const sections = new Set<string>();
    for (const doc of this.docs.values()) {
      sections.add(doc.section);
    }
    return Array.from(sections);
  }
}
