// ============================================================================
// QuantMail - Repos Page
// Repository listing and code browser
// ============================================================================

import React, { useState } from 'react';
import type { Repository, RepoVisibility } from '../types';

export interface ReposPageProps {
  repos: Repository[];
  totalCount: number;
  isLoading: boolean;
  onSelectRepo: (repo: Repository) => void;
  onCreateRepo: (data: { name: string; description: string; visibility: RepoVisibility }) => Promise<void>;
  onDeleteRepo: (repoId: string) => void;
  onSearch: (query: string) => void;
  onFilterChange: (visibility?: RepoVisibility) => void;
  onSortChange: (sort: 'name' | 'created' | 'updated' | 'stars') => void;
}

export function ReposPage(props: ReposPageProps): React.ReactElement {
  const { repos, totalCount, isLoading, onSelectRepo, onCreateRepo, onDeleteRepo, onSearch, onFilterChange, onSortChange } = props;

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRepo, setNewRepo] = useState({ name: '', description: '', visibility: 'private' as RepoVisibility });
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<RepoVisibility | undefined>();
  const [sortBy, setSortBy] = useState<'name' | 'created' | 'updated' | 'stars'>('updated');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRepo.name.trim()) return;
    setIsCreating(true);
    try {
      await onCreateRepo(newRepo);
      setShowCreateModal(false);
      setNewRepo({ name: '', description: '', visibility: 'private' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery);
  };

  const handleFilterChange = (visibility?: RepoVisibility) => {
    setActiveFilter(visibility);
    onFilterChange(visibility);
  };

  const handleSortChange = (sort: 'name' | 'created' | 'updated' | 'stars') => {
    setSortBy(sort);
    onSortChange(sort);
  };

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="repos-page">
      {/* Header */}
      <div className="page-header">
        <h1>Repositories</h1>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          New Repository
        </button>
      </div>

      {/* Toolbar */}
      <div className="repos-toolbar">
        <form className="search-form" onSubmit={handleSearch}>
          <input
            type="search"
            placeholder="Find a repository..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </form>
        <div className="toolbar-filters">
          <select
            value={activeFilter || ''}
            onChange={(e) => handleFilterChange(e.target.value as RepoVisibility || undefined)}
          >
            <option value="">All</option>
            <option value="public">Public</option>
            <option value="private">Private</option>
            <option value="internal">Internal</option>
          </select>
          <select value={sortBy} onChange={(e) => handleSortChange(e.target.value as any)}>
            <option value="updated">Recently updated</option>
            <option value="created">Newest</option>
            <option value="name">Name</option>
            <option value="stars">Stars</option>
          </select>
        </div>
      </div>

      {/* Repo List */}
      <div className="repos-list">
        {isLoading && <div className="loading-indicator">Loading repositories...</div>}
        {!isLoading && repos.length === 0 && (
          <div className="empty-state">
            <h3>No repositories yet</h3>
            <p>Create your first repository to get started with code management.</p>
            <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
              Create Repository
            </button>
          </div>
        )}
        {repos.map((repo) => (
          <div key={repo.id} className="repo-card" onClick={() => onSelectRepo(repo)}>
            <div className="repo-info">
              <div className="repo-name-row">
                <h3 className="repo-name">{repo.name}</h3>
                <span className={`visibility-badge visibility-${repo.visibility}`}>{repo.visibility}</span>
              </div>
              <p className="repo-description">{repo.description || 'No description'}</p>
              <div className="repo-meta">
                {repo.language && <span className="repo-language"><span className="language-dot" />{repo.language}</span>}
                <span className="repo-stat">Stars: {repo.stars}</span>
                <span className="repo-stat">Forks: {repo.forks}</span>
                {repo.openIssues > 0 && <span className="repo-stat">Issues: {repo.openIssues}</span>}
                <span className="repo-stat">{formatSize(repo.size)}</span>
                <span className="repo-updated">Updated {new Date(repo.updatedAt).toLocaleDateString()}</span>
              </div>
              {repo.topics.length > 0 && (
                <div className="repo-topics">
                  {repo.topics.map((topic) => (
                    <span key={topic} className="topic-badge">{topic}</span>
                  ))}
                </div>
              )}
            </div>
            <div className="repo-actions">
              <button className="btn btn-sm btn-outline" onClick={(e) => { e.stopPropagation(); onDeleteRepo(repo.id); }}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      <p className="total-count">{totalCount} repositories</p>

      {/* Create Repo Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create a new repository</h2>
              <button className="btn-icon" onClick={() => setShowCreateModal(false)}>X</button>
            </div>
            <form className="modal-body" onSubmit={handleCreate}>
              <div className="form-group">
                <label>Repository name *</label>
                <input
                  type="text"
                  value={newRepo.name}
                  onChange={(e) => setNewRepo({ ...newRepo, name: e.target.value })}
                  placeholder="my-awesome-project"
                  pattern="^[a-zA-Z0-9_.-]+$"
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={newRepo.description}
                  onChange={(e) => setNewRepo({ ...newRepo, description: e.target.value })}
                  placeholder="Short description of your repository"
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label>Visibility</label>
                <div className="radio-group">
                  <label className="radio-label">
                    <input type="radio" name="visibility" value="public" checked={newRepo.visibility === 'public'} onChange={() => setNewRepo({ ...newRepo, visibility: 'public' })} />
                    <span>Public</span> - Anyone can see this repository
                  </label>
                  <label className="radio-label">
                    <input type="radio" name="visibility" value="private" checked={newRepo.visibility === 'private'} onChange={() => setNewRepo({ ...newRepo, visibility: 'private' })} />
                    <span>Private</span> - You choose who can see and commit
                  </label>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={isCreating || !newRepo.name}>
                  {isCreating ? 'Creating...' : 'Create Repository'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReposPage;
