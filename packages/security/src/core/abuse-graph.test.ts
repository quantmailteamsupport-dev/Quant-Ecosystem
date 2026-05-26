import { describe, it, expect, beforeEach } from 'vitest';
import { AbuseGraph } from './abuse-graph';

describe('AbuseGraph', () => {
  let graph: AbuseGraph;

  beforeEach(() => {
    graph = new AbuseGraph();
  });

  describe('addReport', () => {
    it('should add a report edge between users', () => {
      graph.addReport('user1', 'target1');
      const risk = graph.getUserRisk('target1');
      expect(risk).toBeGreaterThan(0);
    });

    it('should handle multiple reports from same reporter', () => {
      graph.addReport('user1', 'target1');
      graph.addReport('user1', 'target1');
      const risk = graph.getUserRisk('target1');
      expect(risk).toBeGreaterThan(0);
    });
  });

  describe('addBulkReports', () => {
    it('should add multiple reports at once', () => {
      graph.addBulkReports([
        { reporterId: 'user1', targetId: 'target1' },
        { reporterId: 'user2', targetId: 'target1' },
        { reporterId: 'user3', targetId: 'target1' },
      ]);
      const risk = graph.getUserRisk('target1');
      expect(risk).toBeGreaterThan(0);
    });
  });

  describe('detectSybilClusters', () => {
    it('should detect a synthetic sybil cluster (5 users all reporting same 2 targets)', () => {
      // Create a sybil cluster: 5 users all report the same 2 targets
      const sybilUsers = ['sybil1', 'sybil2', 'sybil3', 'sybil4', 'sybil5'];
      const targets = ['victim1', 'victim2'];

      for (const user of sybilUsers) {
        for (const target of targets) {
          graph.addReport(user, target);
        }
      }

      const clusters = graph.detectSybilClusters(3, 0.5);
      expect(clusters.length).toBeGreaterThanOrEqual(1);

      const cluster = clusters[0]!;
      expect(cluster.members.length).toBe(5);
      expect(cluster.density).toBe(1); // All connected to each other
      expect(cluster.targets).toContain('victim1');
      expect(cluster.targets).toContain('victim2');
      expect(cluster.riskScore).toBeGreaterThan(0);
    });

    it('should not trigger sybil detection for normal users with random reports', () => {
      // Normal users reporting different targets independently
      graph.addReport('normalA', 'targetX');
      graph.addReport('normalB', 'targetY');
      graph.addReport('normalC', 'targetZ');
      graph.addReport('normalD', 'targetW');
      graph.addReport('normalE', 'targetV');

      const clusters = graph.detectSybilClusters(3, 0.5);
      expect(clusters.length).toBe(0);
    });

    it('should respect minClusterSize parameter', () => {
      // Only 2 users reporting same target
      graph.addReport('user1', 'target1');
      graph.addReport('user2', 'target1');

      const clusters = graph.detectSybilClusters(3, 0.5);
      expect(clusters.length).toBe(0);
    });
  });

  describe('getUserRisk', () => {
    it('should return 0 risk for unknown user', () => {
      expect(graph.getUserRisk('unknown')).toBe(0);
    });

    it('should return higher risk for users in sybil clusters', () => {
      // Create a sybil cluster
      const sybilUsers = ['sybil1', 'sybil2', 'sybil3', 'sybil4', 'sybil5'];
      for (const user of sybilUsers) {
        graph.addReport(user, 'victim1');
        graph.addReport(user, 'victim2');
      }

      const clusterUserRisk = graph.getUserRisk('sybil1');
      const normalUserRisk = graph.getUserRisk('someRandomUser');
      expect(clusterUserRisk).toBeGreaterThan(normalUserRisk);
    });

    it('should increase risk with more reports received', () => {
      graph.addReport('reporter1', 'target1');
      const risk1 = graph.getUserRisk('target1');

      graph.addReport('reporter2', 'target1');
      graph.addReport('reporter3', 'target1');
      graph.addReport('reporter4', 'target1');
      const risk2 = graph.getUserRisk('target1');

      expect(risk2).toBeGreaterThan(risk1);
    });
  });

  describe('getClusterForUser', () => {
    it('should return null for user not in any cluster', () => {
      graph.addReport('user1', 'target1');
      expect(graph.getClusterForUser('user1')).toBeNull();
    });

    it('should return the cluster for a user in a sybil group', () => {
      const sybilUsers = ['s1', 's2', 's3', 's4'];
      for (const user of sybilUsers) {
        graph.addReport(user, 'victim1');
        graph.addReport(user, 'victim2');
      }

      const cluster = graph.getClusterForUser('s1');
      expect(cluster).not.toBeNull();
      expect(cluster!.members).toContain('s1');
    });
  });

  describe('reset', () => {
    it('should clear all data', () => {
      graph.addReport('user1', 'target1');
      graph.reset();
      expect(graph.getUserRisk('target1')).toBe(0);
      expect(graph.detectSybilClusters()).toHaveLength(0);
    });
  });
});
