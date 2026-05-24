// ============================================================================
// QuantMail - Single Repository Page
// File browser, commits, branches, pull requests, issues
// ============================================================================

import React, { useState } from 'react';
import type { Repository, Branch, Commit, PullRequest, Issue } from '../../types';

export interface RepoDetailPageProps {
  repo: Repository;
  branches: Branch[];
  commits: Commit[];
  pullRequests: PullRequest[];
  issues: Issue[];
  fileTree: string[];
  currentBranch: string;
  isLoading: boolean;
  onBranchChange: (branch: string) => void;
  onFileSelect: (path: string) => void;
  onCreateBranch: (name: string, source: string) => Promise<void>;
  onCreatePR: (data: { title: string; body: string; sourceBranch: string; targetBranch: string }) => Promise<void>;
  onCreateIssue: (data: { title: string; body: string }) => Promise<void>;
  onBack: () => void;
}

type TabId = 'code' | 'commits' | 'pulls' | 'issues' | 'branches';

export function RepoDetailPage(props: RepoDetailPageProps): React.ReactElement {
  const { repo, branches, commits, pullRequests, issues, fileTree, currentBranch, isLoading, onBranchChange, onFileSelect, onCreateBranch, onCreatePR, onCreateIssue, onBack } = props;

  const [activeTab, setActiveTab] = useState<TabId>('code');
  const [showNewPR, setShowNewPR] = useState(false);
  const [showNewIssue, setShowNewIssue] = useState(false);
  const [newPR, setNewPR] = useState({ title: '', body: '', sourceBranch: '', targetBranch: repo.defaultBranch });
  const [newIssue, setNewIssue] = useState({ title: '', body: '' });

  const tabs: Array<{ id: TabId; label: string; count?: number }> = [
    { id: 'code', label: 'Code' },
    { id: 'commits', label: 'Commits', count: commits.length },
    { id: 'pulls', label: 'Pull Requests', count: pullRequests.filter((pr) => pr.status === 'open').length },
    { id: 'issues', label: 'Issues', count: issues.filter((i) => i.status === 'open').length },
    { id: 'branches', label: 'Branches', count: branches.length },
  ];

  const handleCreatePR = async (e: React.FormEvent) => {
    e.preventDefault();
    await onCreatePR(newPR);
    setShowNewPR(false);
    setNewPR({ title: '', body: '', sourceBranch: '', targetBranch: repo.defaultBranch });
  };

  const handleCreateIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    await onCreateIssue(newIssue);
    setShowNewIssue(false);
    setNewIssue({ title: '', body: '' });
  };

  const formatSha = (sha: string) => sha.substring(0, 7);

  return (
    <div className="repo-detail-page">
      {/* Header */}
      <div className="repo-header">
        <button className="btn btn-sm btn-outline" onClick={onBack}>Back</button>
        <div className="repo-title">
          <h1>{repo.name}</h1>
          <span className={`visibility-badge visibility-${repo.visibility}`}>{repo.visibility}</span>
        </div>
        <p className="repo-description">{repo.description}</p>
        <div className="repo-stats">
          <span>Stars: {repo.stars}</span>
          <span>Forks: {repo.forks}</span>
          <span>Issues: {repo.openIssues}</span>
          {repo.language && <span>Language: {repo.language}</span>}
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-bar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
            {tab.count !== undefined && <span className="tab-count">{tab.count}</span>}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="tab-content">
        {activeTab === 'code' && (
          <div className="code-tab">
            <div className="branch-selector">
              <select value={currentBranch} onChange={(e) => onBranchChange(e.target.value)}>
                {branches.map((b) => (
                  <option key={b.name} value={b.name}>{b.name}</option>
                ))}
              </select>
              <span className="file-count">{fileTree.length} files</span>
            </div>
            <div className="file-tree">
              {fileTree.length === 0 && <p className="empty-state">No files yet</p>}
              {fileTree.map((file) => (
                <div key={file} className="file-item" onClick={() => onFileSelect(file)}>
                  <span className="file-icon">{file.includes('.') ? '📄' : '📁'}</span>
                  <span className="file-name">{file}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'commits' && (
          <div className="commits-tab">
            {commits.length === 0 && <p className="empty-state">No commits yet</p>}
            {commits.map((commit) => (
              <div key={commit.sha} className="commit-row">
                <div className="commit-info">
                  <p className="commit-message">{commit.message}</p>
                  <span className="commit-author">{commit.author.name}</span>
                  <span className="commit-date">{new Date(commit.timestamp).toLocaleDateString()}</span>
                </div>
                <div className="commit-meta">
                  <code className="commit-sha">{formatSha(commit.sha)}</code>
                  <span className="commit-stats">+{commit.stats.additions} -{commit.stats.deletions}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'pulls' && (
          <div className="pulls-tab">
            <div className="tab-actions">
              <button className="btn btn-primary btn-sm" onClick={() => setShowNewPR(true)}>New Pull Request</button>
            </div>
            {pullRequests.length === 0 && <p className="empty-state">No pull requests</p>}
            {pullRequests.map((pr) => (
              <div key={pr.id} className="pr-row">
                <span className={`pr-status status-${pr.status}`}>{pr.status}</span>
                <div className="pr-info">
                  <h4>{pr.title}</h4>
                  <span className="pr-meta">
                    #{pr.number} opened by {pr.author.name} - {pr.sourceBranch} into {pr.targetBranch}
                  </span>
                </div>
                <span className="pr-stats">+{pr.additions} -{pr.deletions} ({pr.changedFiles} files)</span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'issues' && (
          <div className="issues-tab">
            <div className="tab-actions">
              <button className="btn btn-primary btn-sm" onClick={() => setShowNewIssue(true)}>New Issue</button>
            </div>
            {issues.length === 0 && <p className="empty-state">No issues</p>}
            {issues.map((issue) => (
              <div key={issue.id} className="issue-row">
                <span className={`issue-status status-${issue.status}`}>{issue.status === 'open' ? '●' : '✓'}</span>
                <div className="issue-info">
                  <h4>{issue.title}</h4>
                  <span className="issue-meta">#{issue.number} opened by {issue.author.name}</span>
                  <div className="issue-labels">
                    {issue.labels.map((label) => <span key={label} className="label-badge">{label}</span>)}
                  </div>
                </div>
                <span className="issue-comments">{issue.comments} comments</span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'branches' && (
          <div className="branches-tab">
            {branches.map((branch) => (
              <div key={branch.name} className="branch-row">
                <span className="branch-name">{branch.name}</span>
                {branch.isProtected && <span className="protected-badge">protected</span>}
                <span className="branch-sha">{formatSha(branch.sha)}</span>
                <span className="branch-status">
                  {branch.aheadBy > 0 && <span className="ahead">+{branch.aheadBy}</span>}
                  {branch.behindBy > 0 && <span className="behind">-{branch.behindBy}</span>}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New PR Modal */}
      {showNewPR && (
        <div className="modal-overlay" onClick={() => setShowNewPR(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>New Pull Request</h2>
            <form onSubmit={handleCreatePR}>
              <div className="form-group">
                <label>Title</label>
                <input type="text" value={newPR.title} onChange={(e) => setNewPR({ ...newPR, title: e.target.value })} required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Source branch</label>
                  <select value={newPR.sourceBranch} onChange={(e) => setNewPR({ ...newPR, sourceBranch: e.target.value })}>
                    <option value="">Select...</option>
                    {branches.map((b) => <option key={b.name} value={b.name}>{b.name}</option>)}
                  </select>
                </div>
                <span className="arrow">into</span>
                <div className="form-group">
                  <label>Target branch</label>
                  <select value={newPR.targetBranch} onChange={(e) => setNewPR({ ...newPR, targetBranch: e.target.value })}>
                    {branches.map((b) => <option key={b.name} value={b.name}>{b.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea value={newPR.body} onChange={(e) => setNewPR({ ...newPR, body: e.target.value })} rows={4} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowNewPR(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={!newPR.title || !newPR.sourceBranch}>Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Issue Modal */}
      {showNewIssue && (
        <div className="modal-overlay" onClick={() => setShowNewIssue(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>New Issue</h2>
            <form onSubmit={handleCreateIssue}>
              <div className="form-group">
                <label>Title</label>
                <input type="text" value={newIssue.title} onChange={(e) => setNewIssue({ ...newIssue, title: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea value={newIssue.body} onChange={(e) => setNewIssue({ ...newIssue, body: e.target.value })} rows={6} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowNewIssue(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={!newIssue.title}>Create Issue</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default RepoDetailPage;
