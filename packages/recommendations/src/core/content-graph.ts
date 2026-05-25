// ============================================================================
// Recommendations Package - Content Graph
// ============================================================================

import type { ContentNode, ContentEdge, ContentRelationType, GraphWalkConfig } from '../types';

/** Directed graph of content relationships with PageRank and clustering */
export class ContentGraph {
  private config: GraphWalkConfig;
  private nodes: Map<string, ContentNode>;
  private edges: Map<string, ContentEdge[]>;
  private inEdges: Map<string, ContentEdge[]>;
  private pageRankScores: Map<string, number>;
  private clusterAssignments: Map<string, number>;

  constructor(config: Partial<GraphWalkConfig> = {}) {
    this.config = {
      restartProbability: config.restartProbability ?? 0.15,
      maxSteps: config.maxSteps ?? 100,
      numWalks: config.numWalks ?? 50,
      dampingFactor: config.dampingFactor ?? 0.85,
      maxIterations: config.maxIterations ?? 100,
      convergenceThreshold: config.convergenceThreshold ?? 1e-6,
      labelPropagationMaxIter: config.labelPropagationMaxIter ?? 50,
    };
    this.nodes = new Map();
    this.edges = new Map();
    this.inEdges = new Map();
    this.pageRankScores = new Map();
    this.clusterAssignments = new Map();
  }

  /** Add a content node to the graph */
  addNode(node: ContentNode): void {
    this.nodes.set(node.id, node);
    if (!this.edges.has(node.id)) {
      this.edges.set(node.id, []);
    }
    if (!this.inEdges.has(node.id)) {
      this.inEdges.set(node.id, []);
    }
  }

  /** Add a directed edge between content nodes */
  addEdge(edge: ContentEdge): void {
    if (!this.nodes.has(edge.source) || !this.nodes.has(edge.target)) {
      return;
    }
    const outEdges = this.edges.get(edge.source);
    if (outEdges) {
      outEdges.push(edge);
    }
    const inEdges = this.inEdges.get(edge.target);
    if (inEdges) {
      inEdges.push(edge);
    }
  }

  /** Get a node by id */
  getNode(nodeId: string): ContentNode | undefined {
    return this.nodes.get(nodeId);
  }

  /** Get outgoing edges from a node */
  getOutEdges(nodeId: string): ContentEdge[] {
    return this.edges.get(nodeId) ?? [];
  }

  /** Get incoming edges to a node */
  getInEdges(nodeId: string): ContentEdge[] {
    return this.inEdges.get(nodeId) ?? [];
  }

  /** Get neighbors by relationship type */
  getNeighborsByRelation(nodeId: string, relation: ContentRelationType): string[] {
    const outEdges = this.edges.get(nodeId) ?? [];
    return outEdges.filter((e) => e.relation === relation).map((e) => e.target);
  }

  /**
   * Compute PageRank-inspired content authority scoring
   * PR(A) = (1-d)/N + d * sum(PR(T)/C(T)) for all T linking to A
   * Where d = damping factor, N = total nodes, C(T) = out-degree of T
   */
  computePageRank(): Map<string, number> {
    const N = this.nodes.size;
    if (N === 0) return new Map();

    const d = this.config.dampingFactor;
    const scores = new Map<string, number>();

    // Initialize all scores to 1/N
    for (const nodeId of this.nodes.keys()) {
      scores.set(nodeId, 1 / N);
    }

    for (let iter = 0; iter < this.config.maxIterations; iter++) {
      const newScores = new Map<string, number>();
      let maxDelta = 0;

      for (const nodeId of this.nodes.keys()) {
        // Sum PR(T)/C(T) for all nodes T that link to this node
        const incomingEdges = this.inEdges.get(nodeId) ?? [];
        let incomingSum = 0;

        for (const edge of incomingEdges) {
          const sourceOutDegree = (this.edges.get(edge.source) ?? []).length;
          if (sourceOutDegree > 0) {
            const sourceScore = scores.get(edge.source) ?? 0;
            incomingSum += (sourceScore * edge.weight) / sourceOutDegree;
          }
        }

        const newScore = (1 - d) / N + d * incomingSum;
        newScores.set(nodeId, newScore);

        const delta = Math.abs(newScore - (scores.get(nodeId) ?? 0));
        maxDelta = Math.max(maxDelta, delta);
      }

      // Update scores
      for (const [nodeId, score] of newScores) {
        scores.set(nodeId, score);
      }

      // Check convergence
      if (maxDelta < this.config.convergenceThreshold) {
        break;
      }
    }

    // Store and update node authority
    this.pageRankScores = scores;
    for (const [nodeId, score] of scores) {
      const node = this.nodes.get(nodeId);
      if (node) {
        node.authority = score;
      }
    }

    return scores;
  }

  /**
   * Random walk with restart for personalized recommendations
   * Starting from a seed node, walk the graph with probability (1-alpha) of following an edge
   * and alpha probability of restarting at the seed
   */
  randomWalkWithRestart(seedNodeId: string): Map<string, number> {
    const visitCounts = new Map<string, number>();
    const alpha = this.config.restartProbability;

    for (let walk = 0; walk < this.config.numWalks; walk++) {
      let currentNode = seedNodeId;

      for (let step = 0; step < this.config.maxSteps; step++) {
        // Record visit
        visitCounts.set(currentNode, (visitCounts.get(currentNode) ?? 0) + 1);

        // Restart with probability alpha
        if (Math.random() < alpha) {
          currentNode = seedNodeId;
          continue;
        }

        // Follow a random outgoing edge
        const outEdges = this.edges.get(currentNode) ?? [];
        if (outEdges.length === 0) {
          currentNode = seedNodeId;
          continue;
        }

        // Weighted random selection based on edge weights
        const totalWeight = outEdges.reduce((sum, e) => sum + e.weight, 0);
        let randomVal = Math.random() * totalWeight;
        let nextNode = outEdges[0]!.target;

        for (const edge of outEdges) {
          randomVal -= edge.weight;
          if (randomVal <= 0) {
            nextNode = edge.target;
            break;
          }
        }

        currentNode = nextNode;
      }
    }

    // Normalize visit counts to probabilities
    const totalVisits = this.config.numWalks * this.config.maxSteps;
    const scores = new Map<string, number>();
    for (const [nodeId, count] of visitCounts) {
      if (nodeId !== seedNodeId) {
        scores.set(nodeId, count / totalVisits);
      }
    }

    return scores;
  }

  /** Get recommendations based on random walk from seed content */
  getWalkRecommendations(
    seedNodeId: string,
    topN: number = 10,
  ): Array<{ nodeId: string; score: number }> {
    const scores = this.randomWalkWithRestart(seedNodeId);
    const sorted = Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN);

    return sorted.map(([nodeId, score]) => ({ nodeId, score }));
  }

  /**
   * Content clustering using label propagation algorithm
   * Each node adopts the most frequent label among its neighbors
   */
  clusterByLabelPropagation(): Map<string, number> {
    const labels = new Map<string, number>();
    let labelCounter = 0;

    // Initialize each node with a unique label
    for (const nodeId of this.nodes.keys()) {
      labels.set(nodeId, labelCounter++);
    }

    const nodeIds = Array.from(this.nodes.keys());

    for (let iter = 0; iter < this.config.labelPropagationMaxIter; iter++) {
      let changed = false;

      // Shuffle nodes for randomness
      for (let i = nodeIds.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = nodeIds[i]!;
        nodeIds[i] = nodeIds[j]!;
        nodeIds[j] = temp;
      }

      for (const nodeId of nodeIds) {
        // Collect neighbor labels (both in and out edges)
        const labelCounts = new Map<number, number>();
        const outEdges = this.edges.get(nodeId) ?? [];
        const inEdges = this.inEdges.get(nodeId) ?? [];

        for (const edge of outEdges) {
          const neighborLabel = labels.get(edge.target);
          if (neighborLabel !== undefined) {
            labelCounts.set(neighborLabel, (labelCounts.get(neighborLabel) ?? 0) + edge.weight);
          }
        }

        for (const edge of inEdges) {
          const neighborLabel = labels.get(edge.source);
          if (neighborLabel !== undefined) {
            labelCounts.set(neighborLabel, (labelCounts.get(neighborLabel) ?? 0) + edge.weight);
          }
        }

        if (labelCounts.size === 0) continue;

        // Find most frequent label
        let maxCount = 0;
        let bestLabel = labels.get(nodeId)!;
        for (const [label, count] of labelCounts) {
          if (count > maxCount) {
            maxCount = count;
            bestLabel = label;
          }
        }

        const currentLabel = labels.get(nodeId)!;
        if (bestLabel !== currentLabel) {
          labels.set(nodeId, bestLabel);
          changed = true;
        }
      }

      // Converged if no changes
      if (!changed) break;
    }

    // Update node cluster assignments
    this.clusterAssignments = labels;
    for (const [nodeId, cluster] of labels) {
      const node = this.nodes.get(nodeId);
      if (node) {
        node.cluster = cluster;
      }
    }

    return labels;
  }

  /** Get all nodes in a cluster */
  getClusterMembers(clusterId: number): ContentNode[] {
    const members: ContentNode[] = [];
    for (const [nodeId, cluster] of this.clusterAssignments) {
      if (cluster === clusterId) {
        const node = this.nodes.get(nodeId);
        if (node) members.push(node);
      }
    }
    return members;
  }

  /**
   * Topic hierarchy inference from co-occurrence
   * Nodes that frequently co-occur as neighbors share topic relationships
   */
  inferTopicHierarchy(): Map<string, string[]> {
    const topicMap = new Map<string, string[]>();

    // Group nodes by content type
    const typeGroups = new Map<string, ContentNode[]>();
    for (const node of this.nodes.values()) {
      const group = typeGroups.get(node.contentType) ?? [];
      group.push(node);
      typeGroups.set(node.contentType, group);
    }

    // For each content type, find co-occurrence patterns
    for (const [contentType, nodes] of typeGroups) {
      const cooccurrence = new Map<string, Map<string, number>>();

      for (const node of nodes) {
        const neighbors = this.getOutEdges(node.id).map((e) => e.target);
        for (const neighbor of neighbors) {
          const neighborNode = this.nodes.get(neighbor);
          if (!neighborNode) continue;

          if (!cooccurrence.has(node.id)) {
            cooccurrence.set(node.id, new Map());
          }
          const nodeCooc = cooccurrence.get(node.id)!;
          nodeCooc.set(neighborNode.contentType, (nodeCooc.get(neighborNode.contentType) ?? 0) + 1);
        }
      }

      // Topics that frequently co-occur with this content type
      const relatedTypes = new Map<string, number>();
      for (const nodeCooc of cooccurrence.values()) {
        for (const [type, count] of nodeCooc) {
          relatedTypes.set(type, (relatedTypes.get(type) ?? 0) + count);
        }
      }

      const sortedRelated = Array.from(relatedTypes.entries())
        .filter(([type]) => type !== contentType)
        .sort((a, b) => b[1] - a[1])
        .map(([type]) => type);

      topicMap.set(contentType, sortedRelated);
    }

    return topicMap;
  }

  /**
   * Shortest path between content nodes using BFS
   */
  shortestPath(sourceId: string, targetId: string): string[] | null {
    if (!this.nodes.has(sourceId) || !this.nodes.has(targetId)) {
      return null;
    }
    if (sourceId === targetId) return [sourceId];

    const visited = new Set<string>();
    const queue: Array<{ nodeId: string; path: string[] }> = [];
    queue.push({ nodeId: sourceId, path: [sourceId] });
    visited.add(sourceId);

    while (queue.length > 0) {
      const current = queue.shift()!;

      const outEdges = this.edges.get(current.nodeId) ?? [];
      for (const edge of outEdges) {
        if (edge.target === targetId) {
          return [...current.path, targetId];
        }
        if (!visited.has(edge.target)) {
          visited.add(edge.target);
          queue.push({ nodeId: edge.target, path: [...current.path, edge.target] });
        }
      }
    }

    return null; // No path found
  }

  /** Get graph statistics */
  getStats(): { nodes: number; edges: number; avgDegree: number; clusters: number } {
    let totalEdges = 0;
    for (const edgeList of this.edges.values()) {
      totalEdges += edgeList.length;
    }

    const uniqueClusters = new Set(this.clusterAssignments.values());

    return {
      nodes: this.nodes.size,
      edges: totalEdges,
      avgDegree: this.nodes.size > 0 ? totalEdges / this.nodes.size : 0,
      clusters: uniqueClusters.size,
    };
  }

  /** Get top-authority content nodes */
  getTopAuthorities(topN: number = 10): Array<{ nodeId: string; authority: number }> {
    const sorted = Array.from(this.pageRankScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN);

    return sorted.map(([nodeId, authority]) => ({ nodeId, authority }));
  }
}
