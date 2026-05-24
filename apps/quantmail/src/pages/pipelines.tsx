// ============================================================================
// QuantMail - Pipelines Page (CI/CD Dashboard)
// ============================================================================

import React, { useState } from 'react';
import type { Workflow, Build, Deployment, WorkflowStatus } from '../types';

export interface PipelinesPageProps {
  workflows: Workflow[];
  builds: Build[];
  deployments: Deployment[];
  isLoading: boolean;
  onTriggerWorkflow: (workflowId: string, branch?: string) => Promise<void>;
  onCancelBuild: (buildId: string) => void;
  onRetryBuild: (buildId: string) => void;
  onViewLogs: (buildId: string) => void;
  onDeploy: (data: { buildId: string; environment: string; version: string }) => Promise<void>;
}

type TabId = 'builds' | 'workflows' | 'deployments';

const statusColors: Record<WorkflowStatus, string> = {
  pending: '#f59e0b',
  running: '#3b82f6',
  success: '#10b981',
  failure: '#ef4444',
  cancelled: '#6b7280',
  skipped: '#9ca3af',
};

export function PipelinesPage(props: PipelinesPageProps): React.ReactElement {
  const { workflows, builds, deployments, isLoading, onTriggerWorkflow, onCancelBuild, onRetryBuild, onViewLogs, onDeploy } = props;

  const [activeTab, setActiveTab] = useState<TabId>('builds');

  const formatDuration = (ms?: number): string => {
    if (!ms) return '-';
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  };

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="pipelines-page">
      <div className="page-header">
        <h1>CI/CD Pipelines</h1>
        <div className="header-stats">
          <span className="stat"><span className="stat-dot" style={{ backgroundColor: statusColors.running }} />{builds.filter((b) => b.status === 'running').length} running</span>
          <span className="stat"><span className="stat-dot" style={{ backgroundColor: statusColors.success }} />{builds.filter((b) => b.status === 'success').length} passed</span>
          <span className="stat"><span className="stat-dot" style={{ backgroundColor: statusColors.failure }} />{builds.filter((b) => b.status === 'failure').length} failed</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-bar">
        <button className={`tab ${activeTab === 'builds' ? 'active' : ''}`} onClick={() => setActiveTab('builds')}>
          Builds ({builds.length})
        </button>
        <button className={`tab ${activeTab === 'workflows' ? 'active' : ''}`} onClick={() => setActiveTab('workflows')}>
          Workflows ({workflows.length})
        </button>
        <button className={`tab ${activeTab === 'deployments' ? 'active' : ''}`} onClick={() => setActiveTab('deployments')}>
          Deployments ({deployments.length})
        </button>
      </div>

      {/* Builds Tab */}
      {activeTab === 'builds' && (
        <div className="builds-list">
          {isLoading && <div className="loading-indicator">Loading builds...</div>}
          {!isLoading && builds.length === 0 && <div className="empty-state"><p>No builds yet. Trigger a workflow to get started.</p></div>}
          {builds.map((build) => (
            <div key={build.id} className="build-card">
              <div className="build-status" style={{ borderLeftColor: statusColors[build.status] }}>
                <span className={`status-icon status-${build.status}`}>{build.status === 'success' ? '✓' : build.status === 'failure' ? '✗' : build.status === 'running' ? '◎' : '◯'}</span>
              </div>
              <div className="build-info">
                <div className="build-title">
                  <h4>#{build.number} - {build.commitMessage}</h4>
                  <span className={`build-status-badge status-${build.status}`}>{build.status}</span>
                </div>
                <div className="build-meta">
                  <span>Branch: {build.branch}</span>
                  <span>Commit: {build.commit.substring(0, 7)}</span>
                  <span>By: {build.author.name}</span>
                  <span>Started: {formatDate(build.startedAt)}</span>
                  <span>Duration: {formatDuration(build.duration)}</span>
                </div>
                {build.jobs.length > 0 && (
                  <div className="build-jobs">
                    {build.jobs.map((job) => (
                      <span key={job.id} className={`job-badge job-${job.status}`}>{job.name}: {job.status}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="build-actions">
                <button className="btn btn-sm btn-outline" onClick={() => onViewLogs(build.id)}>Logs</button>
                {(build.status === 'running' || build.status === 'pending') && (
                  <button className="btn btn-sm btn-outline" onClick={() => onCancelBuild(build.id)}>Cancel</button>
                )}
                {(build.status === 'failure' || build.status === 'cancelled') && (
                  <button className="btn btn-sm btn-outline" onClick={() => onRetryBuild(build.id)}>Retry</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Workflows Tab */}
      {activeTab === 'workflows' && (
        <div className="workflows-list">
          {workflows.length === 0 && <div className="empty-state"><p>No workflows configured.</p></div>}
          {workflows.map((wf) => (
            <div key={wf.id} className="workflow-card">
              <div className="workflow-info">
                <h4>{wf.name}</h4>
                <span className="workflow-file">{wf.filename}</span>
                <div className="workflow-meta">
                  <span>Triggers: {wf.trigger.events.join(', ')}</span>
                  {wf.trigger.branches && <span>Branches: {wf.trigger.branches.join(', ')}</span>}
                  {wf.lastRunAt && <span>Last run: {formatDate(wf.lastRunAt)}</span>}
                  {wf.lastRunStatus && <span className={`status-badge status-${wf.lastRunStatus}`}>{wf.lastRunStatus}</span>}
                </div>
              </div>
              <div className="workflow-actions">
                <span className={`enabled-badge ${wf.isEnabled ? 'enabled' : 'disabled'}`}>{wf.isEnabled ? 'Enabled' : 'Disabled'}</span>
                <button className="btn btn-sm btn-primary" onClick={() => onTriggerWorkflow(wf.id)} disabled={!wf.isEnabled}>
                  Run workflow
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Deployments Tab */}
      {activeTab === 'deployments' && (
        <div className="deployments-list">
          {deployments.length === 0 && <div className="empty-state"><p>No deployments yet.</p></div>}
          {deployments.map((dep) => (
            <div key={dep.id} className="deployment-card">
              <div className="deployment-info">
                <div className="deployment-header">
                  <span className={`env-badge env-${dep.environment}`}>{dep.environment}</span>
                  <span className={`status-badge status-${dep.status}`}>{dep.status}</span>
                </div>
                <p className="deployment-version">v{dep.version}</p>
                <div className="deployment-meta">
                  <span>Deployed by: {dep.deployer.name}</span>
                  <span>Started: {formatDate(dep.startedAt)}</span>
                  {dep.url && <a href={dep.url} className="deployment-url">{dep.url}</a>}
                  {dep.healthCheck && (
                    <span className={`health-badge health-${dep.healthCheck.status}`}>
                      {dep.healthCheck.status}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default PipelinesPage;
