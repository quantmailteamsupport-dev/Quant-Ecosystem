// ============================================================================
// Search Package - Knowledge Graph
// ============================================================================

import type { KnowledgeTriple, KGEntityType } from '../types';

interface EntityNode {
  id: string;
  name: string;
  type: string;
  properties: Map<string, unknown>;
  outgoingTriples: KnowledgeTriple[];
  incomingTriples: KnowledgeTriple[];
}

interface GraphPattern {
  subject?: string;
  predicate?: string;
  object?: string;
  subjectType?: string;
  objectType?: string;
}

/** Knowledge graph with triple store, type hierarchy, and graph querying */
export class KnowledgeGraph {
  private entities: Map<string, EntityNode>;
  private triples: KnowledgeTriple[];
  private typeHierarchy: Map<string, KGEntityType>;
  private predicateIndex: Map<string, KnowledgeTriple[]>;
  private typeIndex: Map<string, Set<string>>;

  constructor() {
    this.entities = new Map();
    this.triples = [];
    this.typeHierarchy = new Map();
    this.predicateIndex = new Map();
    this.typeIndex = new Map();
  }

  /** Register an entity type with optional parent for inheritance */
  registerType(entityType: KGEntityType): void {
    this.typeHierarchy.set(entityType.name, entityType);
    if (!this.typeIndex.has(entityType.name)) {
      this.typeIndex.set(entityType.name, new Set());
    }
  }

  /** Check if a type is a subtype of another (including transitive) */
  isSubtypeOf(childType: string, parentType: string): boolean {
    if (childType === parentType) return true;

    const childDef = this.typeHierarchy.get(childType);
    if (!childDef || !childDef.parent) return false;

    return this.isSubtypeOf(childDef.parent, parentType);
  }

  /** Get all properties for a type (including inherited) */
  getTypeProperties(typeName: string): string[] {
    const typeDef = this.typeHierarchy.get(typeName);
    if (!typeDef) return [];

    const properties = [...typeDef.properties];
    if (typeDef.parent) {
      properties.push(...this.getTypeProperties(typeDef.parent));
    }

    return [...new Set(properties)];
  }

  /** Add or update an entity */
  addEntity(id: string, name: string, type: string, properties?: Record<string, unknown>): void {
    const propsMap = new Map<string, unknown>();
    if (properties) {
      for (const [key, value] of Object.entries(properties)) {
        propsMap.set(key, value);
      }
    }

    if (!this.entities.has(id)) {
      this.entities.set(id, {
        id,
        name,
        type,
        properties: propsMap,
        outgoingTriples: [],
        incomingTriples: [],
      });
    } else {
      const entity = this.entities.get(id)!;
      entity.name = name;
      entity.type = type;
      for (const [key, value] of propsMap) {
        entity.properties.set(key, value);
      }
    }

    // Update type index
    if (!this.typeIndex.has(type)) {
      this.typeIndex.set(type, new Set());
    }
    this.typeIndex.get(type)!.add(id);
  }

  /** Add a triple (subject-predicate-object) relationship */
  addTriple(triple: KnowledgeTriple): void {
    this.triples.push(triple);

    // Index by predicate
    if (!this.predicateIndex.has(triple.predicate)) {
      this.predicateIndex.set(triple.predicate, []);
    }
    this.predicateIndex.get(triple.predicate)!.push(triple);

    // Update entity references
    const subjectEntity = this.entities.get(triple.subject);
    if (subjectEntity) {
      subjectEntity.outgoingTriples.push(triple);
    }

    const objectEntity = this.entities.get(triple.object);
    if (objectEntity) {
      objectEntity.incomingTriples.push(triple);
    }
  }

  /** Get an entity by id */
  getEntity(entityId: string): EntityNode | undefined {
    return this.entities.get(entityId);
  }

  /** Get all triples where entity is subject */
  getOutgoingTriples(entityId: string): KnowledgeTriple[] {
    const entity = this.entities.get(entityId);
    return entity?.outgoingTriples ?? [];
  }

  /** Get all triples where entity is object */
  getIncomingTriples(entityId: string): KnowledgeTriple[] {
    const entity = this.entities.get(entityId);
    return entity?.incomingTriples ?? [];
  }

  /** Get entities of a given type (including subtypes) */
  getEntitiesByType(typeName: string, includeSubtypes: boolean = true): EntityNode[] {
    const result: EntityNode[] = [];

    if (includeSubtypes) {
      // Collect all subtypes
      for (const [type, entityIds] of this.typeIndex) {
        if (this.isSubtypeOf(type, typeName)) {
          for (const id of entityIds) {
            const entity = this.entities.get(id);
            if (entity) result.push(entity);
          }
        }
      }
    } else {
      const entityIds = this.typeIndex.get(typeName);
      if (entityIds) {
        for (const id of entityIds) {
          const entity = this.entities.get(id);
          if (entity) result.push(entity);
        }
      }
    }

    return result;
  }

  /**
   * Relationship traversal using BFS
   * Finds all entities reachable within maxDepth hops
   */
  traverseBFS(
    startEntityId: string,
    maxDepth: number = 3,
    predicateFilter?: string,
  ): Array<{ entityId: string; depth: number; path: string[] }> {
    const visited = new Set<string>();
    const results: Array<{ entityId: string; depth: number; path: string[] }> = [];
    const queue: Array<{ entityId: string; depth: number; path: string[] }> = [];

    queue.push({ entityId: startEntityId, depth: 0, path: [startEntityId] });
    visited.add(startEntityId);

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current.depth > 0) {
        results.push(current);
      }

      if (current.depth >= maxDepth) continue;

      // Explore outgoing triples
      const entity = this.entities.get(current.entityId);
      if (!entity) continue;

      for (const triple of entity.outgoingTriples) {
        if (predicateFilter && triple.predicate !== predicateFilter) continue;
        if (visited.has(triple.object)) continue;

        visited.add(triple.object);
        queue.push({
          entityId: triple.object,
          depth: current.depth + 1,
          path: [...current.path, triple.object],
        });
      }

      // Also explore incoming triples (bidirectional traversal)
      for (const triple of entity.incomingTriples) {
        if (predicateFilter && triple.predicate !== predicateFilter) continue;
        if (visited.has(triple.subject)) continue;

        visited.add(triple.subject);
        queue.push({
          entityId: triple.subject,
          depth: current.depth + 1,
          path: [...current.path, triple.subject],
        });
      }
    }

    return results;
  }

  /**
   * Relationship traversal using DFS
   * Finds all paths from start entity up to maxDepth
   */
  traverseDFS(
    startEntityId: string,
    maxDepth: number = 3,
    predicateFilter?: string,
  ): Array<{ entityId: string; depth: number; path: string[] }> {
    const results: Array<{ entityId: string; depth: number; path: string[] }> = [];
    const visited = new Set<string>();

    const dfs = (entityId: string, depth: number, path: string[]): void => {
      if (depth > maxDepth) return;
      visited.add(entityId);

      if (depth > 0) {
        results.push({ entityId, depth, path: [...path] });
      }

      const entity = this.entities.get(entityId);
      if (!entity) return;

      for (const triple of entity.outgoingTriples) {
        if (predicateFilter && triple.predicate !== predicateFilter) continue;
        if (visited.has(triple.object)) continue;
        dfs(triple.object, depth + 1, [...path, triple.object]);
      }

      for (const triple of entity.incomingTriples) {
        if (predicateFilter && triple.predicate !== predicateFilter) continue;
        if (visited.has(triple.subject)) continue;
        dfs(triple.subject, depth + 1, [...path, triple.subject]);
      }

      visited.delete(entityId);
    };

    dfs(startEntityId, 0, [startEntityId]);
    return results;
  }

  /**
   * Bidirectional BFS to find shortest path between two entities
   */
  findShortestPath(startId: string, endId: string, maxDepth: number = 6): string[] | null {
    if (startId === endId) return [startId];
    if (!this.entities.has(startId) || !this.entities.has(endId)) return null;

    // BFS from both ends
    const forwardVisited = new Map<string, string[]>();
    const backwardVisited = new Map<string, string[]>();
    const forwardQueue: Array<{ entityId: string; path: string[] }> = [];
    const backwardQueue: Array<{ entityId: string; path: string[] }> = [];

    forwardQueue.push({ entityId: startId, path: [startId] });
    backwardQueue.push({ entityId: endId, path: [endId] });
    forwardVisited.set(startId, [startId]);
    backwardVisited.set(endId, [endId]);

    for (let depth = 0; depth < maxDepth; depth++) {
      // Expand forward
      const forwardNext: Array<{ entityId: string; path: string[] }> = [];
      for (const current of forwardQueue) {
        const entity = this.entities.get(current.entityId);
        if (!entity) continue;

        const neighbors = [
          ...entity.outgoingTriples.map((t) => t.object),
          ...entity.incomingTriples.map((t) => t.subject),
        ];

        for (const neighbor of neighbors) {
          if (forwardVisited.has(neighbor)) continue;
          const newPath = [...current.path, neighbor];
          forwardVisited.set(neighbor, newPath);
          forwardNext.push({ entityId: neighbor, path: newPath });

          // Check if backward search already visited this node
          if (backwardVisited.has(neighbor)) {
            const backwardPath = backwardVisited.get(neighbor)!;
            return [...newPath.slice(0, -1), ...backwardPath.reverse()];
          }
        }
      }
      forwardQueue.length = 0;
      forwardQueue.push(...forwardNext);

      // Expand backward
      const backwardNext: Array<{ entityId: string; path: string[] }> = [];
      for (const current of backwardQueue) {
        const entity = this.entities.get(current.entityId);
        if (!entity) continue;

        const neighbors = [
          ...entity.outgoingTriples.map((t) => t.object),
          ...entity.incomingTriples.map((t) => t.subject),
        ];

        for (const neighbor of neighbors) {
          if (backwardVisited.has(neighbor)) continue;
          const newPath = [...current.path, neighbor];
          backwardVisited.set(neighbor, newPath);
          backwardNext.push({ entityId: neighbor, path: newPath });

          // Check if forward search already visited this node
          if (forwardVisited.has(neighbor)) {
            const forwardPath = forwardVisited.get(neighbor)!;
            return [...forwardPath, ...newPath.slice(1).reverse()];
          }
        }
      }
      backwardQueue.length = 0;
      backwardQueue.push(...backwardNext);
    }

    return null; // No path found within depth limit
  }

  /**
   * Graph pattern matching for SPARQL-like queries
   * Matches triples against a pattern with optional wildcards
   */
  matchPattern(pattern: GraphPattern): KnowledgeTriple[] {
    const results: KnowledgeTriple[] = [];

    // Use predicate index if predicate is specified
    const candidateTriples = pattern.predicate
      ? (this.predicateIndex.get(pattern.predicate) ?? [])
      : this.triples;

    for (const triple of candidateTriples) {
      // Check subject match
      if (pattern.subject && triple.subject !== pattern.subject) continue;

      // Check object match
      if (pattern.object && triple.object !== pattern.object) continue;

      // Check subject type
      if (pattern.subjectType) {
        const subjectEntity = this.entities.get(triple.subject);
        if (!subjectEntity || !this.isSubtypeOf(subjectEntity.type, pattern.subjectType)) continue;
      }

      // Check object type
      if (pattern.objectType) {
        const objectEntity = this.entities.get(triple.object);
        if (!objectEntity || !this.isSubtypeOf(objectEntity.type, pattern.objectType)) continue;
      }

      results.push(triple);
    }

    return results;
  }

  /** Execute a multi-pattern query (conjunction of patterns) */
  queryPatterns(patterns: GraphPattern[]): Map<string, Set<string>> {
    const bindings = new Map<string, Set<string>>();

    for (const pattern of patterns) {
      const matches = this.matchPattern(pattern);
      const subjects = new Set<string>();
      const objects = new Set<string>();

      for (const triple of matches) {
        subjects.add(triple.subject);
        objects.add(triple.object);
      }

      if (pattern.subject && pattern.subject.startsWith('?')) {
        const existing = bindings.get(pattern.subject);
        if (existing) {
          // Intersect with existing bindings
          const intersection = new Set<string>();
          for (const s of subjects) {
            if (existing.has(s)) intersection.add(s);
          }
          bindings.set(pattern.subject, intersection);
        } else {
          bindings.set(pattern.subject, subjects);
        }
      }

      if (pattern.object && pattern.object.startsWith('?')) {
        const existing = bindings.get(pattern.object);
        if (existing) {
          const intersection = new Set<string>();
          for (const o of objects) {
            if (existing.has(o)) intersection.add(o);
          }
          bindings.set(pattern.object, intersection);
        } else {
          bindings.set(pattern.object, objects);
        }
      }
    }

    return bindings;
  }

  /**
   * Entity disambiguation using context similarity scoring
   * Given multiple candidate entities, ranks them by context relevance
   */
  disambiguateEntity(
    candidates: string[],
    contextEntityIds: string[],
  ): Array<{ entityId: string; score: number }> {
    const scored: Array<{ entityId: string; score: number }> = [];

    for (const candidateId of candidates) {
      const candidate = this.entities.get(candidateId);
      if (!candidate) continue;

      let score = 0;

      // Score based on connectivity to context entities
      for (const contextId of contextEntityIds) {
        // Check direct connection
        const hasDirectConnection =
          candidate.outgoingTriples.some((t) => t.object === contextId) ||
          candidate.incomingTriples.some((t) => t.subject === contextId);

        if (hasDirectConnection) {
          score += 1.0;
        } else {
          // Check 2-hop connection
          const path = this.findShortestPath(candidateId, contextId, 2);
          if (path && path.length <= 3) {
            score += 0.5 / path.length;
          }
        }
      }

      // Normalize by number of context entities
      if (contextEntityIds.length > 0) {
        score /= contextEntityIds.length;
      }

      scored.push({ entityId: candidateId, score });
    }

    scored.sort((a, b) => b.score - a.score);
    return scored;
  }

  /**
   * Subgraph extraction for query context
   * Extracts a relevant subgraph around seed entities
   */
  extractSubgraph(
    seedEntityIds: string[],
    maxDepth: number = 2,
  ): {
    entities: EntityNode[];
    triples: KnowledgeTriple[];
  } {
    const subgraphEntities = new Set<string>();
    const subgraphTriples: KnowledgeTriple[] = [];

    for (const seedId of seedEntityIds) {
      subgraphEntities.add(seedId);

      // BFS to collect nearby entities
      const nearby = this.traverseBFS(seedId, maxDepth);
      for (const node of nearby) {
        subgraphEntities.add(node.entityId);
      }
    }

    // Collect triples between subgraph entities
    for (const triple of this.triples) {
      if (subgraphEntities.has(triple.subject) && subgraphEntities.has(triple.object)) {
        subgraphTriples.push(triple);
      }
    }

    const entities: EntityNode[] = [];
    for (const entityId of subgraphEntities) {
      const entity = this.entities.get(entityId);
      if (entity) entities.push(entity);
    }

    return { entities, triples: subgraphTriples };
  }

  /** Get graph statistics */
  getStats(): { entities: number; triples: number; types: number; predicates: number } {
    return {
      entities: this.entities.size,
      triples: this.triples.length,
      types: this.typeHierarchy.size,
      predicates: this.predicateIndex.size,
    };
  }
}
